@(echo off) > $null 
if #ftw NEQ '' goto :init
($true){ $Error.clear(); }

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

# wrapper script for ce.
# this is intended to be dot-sourced and then you can use the ce() function

# unpack arguments if they came from CMD
$hash=@{}; 
get-item env:argz* |% { $hash[$_.name] = $_.value }
if ($hash.count -gt 0) { 
  $args=for ($i=0; $i -lt $hash.count;$i++) { $hash["ARGZ[$i]"] }
}
# force the array to be an arraylist since we like to mutate it.
$args=[System.Collections.ArrayList][System.Array]$args

# GLOBALS
$VCPKG_NODE_LATEST='14.17.0'
$VCPKG_NODE_REMOTE='https://nodejs.org/dist/'
$VCPKG_PWD=$pwd

$VCPKG_START_TIME=get-date

function resolve { 
    param ( [string] $name )
    $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
    if (-not($name)) { return $_err[0].TargetObject }
    $Error.clear()
    return $name
}

$SCRIPT:DEBUG=$false

if( $args.indexOf('--debug') -gt -1 ) {
  $SCRIPT:DEBUG=$true
}

function ce-debug() {
  $t = [int32]((get-date).Subtract(($VCPKG_START_TIME)).ticks/10000)
  if($SCRIPT:DEBUG) { 
    write-host -fore green "[$t msec] " -nonewline
    write-host -fore gray $args
  }
  
  write-output "[$t msec] $args" >> $VCPKG_ROOT/log.txt
}

# set the home path. 
if( $ENV:VCPKG_ROOT ) { 
  $SCRIPT:VCPKG_ROOT=(resolve $ENV:VCPKG_ROOT)
  $ENV:VCPKG_ROOT=$VCPKG_ROOT
} else {
  $SCRIPT:VCPKG_ROOT=(resolve "$HOME/.vcpkg")
  $ENV:VCPKG_ROOT=$VCPKG_ROOT
}

$reset = $args.IndexOf('--reset-ce') -gt -1 
$remove = $args.IndexOf('--remove-ce') -gt -1 

if( $reset -or -$remove ) {
  $args.remove('--reset-ce');
  $args.remove('--remove-ce');

  if( $reset ) {
    write-host "Resetting vcpkg-ce"
  }

  remove-item -recurse -force -ea 0 "${VCPKG_ROOT}/node_modules"
  remove-item -recurse -force -ea 0 "${VCPKG_ROOT}/bin"
  remove-item -recurse -force -ea 0 "${VCPKG_ROOT}/lib"
  remove-item -force -ea 0 "${VCPKG_ROOT}/ce.ps1"
  remove-item -force -ea 0 "${VCPKG_ROOT}/ce.cmd"
  remove-item -force -ea 0 "${VCPKG_ROOT}/ce"  
  remove-item -force -ea 0 "${VCPKG_ROOT}/NOTICE.txt"
  remove-item -force -ea 0 "${VCPKG_ROOT}/LICENSE.txt"
  $error.clear();

  if( $remove ) { 
    write-host "Removing vcpkg-ce"
    exit
  }
}

function verify-node() {
  param( $NODE ) 

  if( $NODE ) {
    if( get-command -ea 0 $NODE ) {
      if( (& $NODE -e "[major, minor, patch ] = process.versions.node.split('.'); console.log( major>14 || major == 14 & minor >= 17)") -gt 0 ) {
        # good version of node
        # set the variables 

        $SCRIPT:VCPKG_NODE=$NODE
        if( isWindows ) {
          $SCRIPT:VCPKG_NPM=resolve "${VCPKG_NODE}\..\node_modules\npm"
        } else {
          $SCRIPT:VCPKG_NPM=resolve "${VCPKG_NODE}\..\npm"
        }
        $error.clear();
        return $TRUE;  
      }
    }
  }
  $error.clear();
  return $FALSE
}

function isWindows {
  if( ($PSVersionTable.OS -match "windows") -or ($PSVersionTable.PSEdition -match 'desktop') ) { 
    return $true;
  }
  return $false;
}

function bootstrap-node {
  # if we have a custom ce node let's use that first
  if( (verify-node (resolve "${VCPKG_ROOT}/cache/bin/node"))) {
    ce-debug "Node: ${VCPKG_NODE}"
    return $TRUE;
  }

  # check the node on the path.
  if( (verify-node ((get-command node -ea 0).source ))) {
    ce-debug "Node: ${VCPKG_NODE}"
    return $TRUE;
  }

  # not there, or not good enough

  if( isWindows ) { 
    $NODE_OS='win' 
    switch($ENV:PROCESSOR_ARCHITECTURE) {
      'AMD64' { $NODE_ARCH='x64' }
      'ARM64' { $NODE_ARCH='arm64' }
      Default { $NODE_ARCH='x86' }
    }
    $NODE_ARCHIVE_EXT=".zip"
  } else {
    $NODE_OS=(uname | sed 'y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/')
    $NODE_ARCH=(uname -m | sed -e 's/x86_64/x64/;s/i86pc/x64/;s/i686/x86/;s/aarch64/arm64/')
    if ( $NODE_OS -eq "aix" ) { $NODE_ARCH="ppc64" } #aix special 
    $NODE_ARCHIVE_EXT=".tar.gz"
  }

  $NODE_FULLNAME="node-v${VCPKG_NODE_LATEST}-${NODE_OS}-${NODE_ARCH}"
  $NODE_URI="${VCPKG_NODE_REMOTE}v${VCPKG_NODE_LATEST}/${NODE_FULLNAME}${NODE_ARCHIVE_EXT}"
  $NODE_ARCHIVE= resolve "${VCPKG_ROOT}/cache/${NODE_FULLNAME}${NODE_ARCHIVE_EXT}"

  $shh = new-item -type directory  "${VCPKG_ROOT}/cache" -ea 0
  
  $ProgressPreference = 'SilentlyContinue'
  ce-debug "Downloading Node: ${NODE_URI}"
  invoke-webrequest -Uri $NODE_URI -outfile $NODE_ARCHIVE 

  switch($NODE_OS){
    'win' { 
      if( get-command -ea 0 tar.exe ) {
        tar "-xvf" "${NODE_ARCHIVE}" -C "${VCPKG_ROOT}/cache"  2>&1  > $null
      } else {
        $shh= expand-archive -path $NODE_ARCHIVE -destinationpath "${VCPKG_ROOT}/cache" 
      }
      move-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}" "${VCPKG_ROOT}/cache/bin" 
    }
    'aix' { 
      $shh = gunzip "${NODE_ARCHIVE}" | tar -xvC "${VCPKG_ROOT}/cache" "${NODE_FULLNAME}/bin/${NODE_EXE}" 
      move-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}/bin" "${VCPKG_ROOT}/cache/" 
      move-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}/lib" "${VCPKG_ROOT}/cache/"  
      remove-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}" -force -recurse 
    } 
    default { 
      $shh = tar "-zxvf" "${NODE_ARCHIVE}" -C "${VCPKG_ROOT}/cache"  
      move-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}/bin" "${VCPKG_ROOT}/cache/" 
      move-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}/lib" "${VCPKG_ROOT}/cache/"   
      remove-item "${VCPKG_ROOT}/cache/${NODE_FULLNAME}" -force -recurse 
    } 
  }

  if( (verify-node (resolve "${VCPKG_ROOT}/cache/bin/node"))) {
    ce-debug "Node: ${VCPKG_NODE}"
    return $TRUE;
  }

  write-error 'Unable to resolve nodejs'
  return $FALSE; 
}


function bootstrap-vcpkg-ce {
  $SCRIPT:VCPKG_SCRIPT=(resolve ${VCPKG_ROOT}/node_modules/.bin/ce.ps1)
  $SCRIPT:VCPKG_MODULE=(resolve ${VCPKG_ROOT}/node_modules/@microsoft/vcpkg-ce )

  if( test-path $VCPKG_SCRIPT ) {
    return $TRUE;
  }

  ## if we're running from an installed module location, we'll keep that. 
  $MODULE=(resolve ${PSScriptRoot}/node_modules/@microsoft/vcpkg-ce )

  if( test-path $MODULE ) {
    $SCRIPT:VCPKG_MODULE=$MODULE
    return $TRUE
  }
    
  ce-debug "Bootstrapping vcpkg-ce: ${VCPKG_ROOT}"

  # ensure we have a node_modules here, so npm won't search for one up the tree.
  $shh = new-item -type directory -ea 0 $VCPKG_ROOT/node_modules
  pushd $VCPKG_ROOT
  
  $shh = & $VCPKG_NODE $VCPKG_NPM cache clean --force 2>&1 
  $error.clear();

  write-host "Installing vcpkg-ce to ${VCPKG_ROOT}"

  if( isWindows ) {
    if( $USE_LOCAL_VCPKG_PKG ) {
      write-host -fore cyan Using Local Package: $USE_LOCAL_VCPKG_PKG
      & $VCPKG_NODE $VCPKG_NPM install --force --no-save --scripts-prepend-node-path=true $USE_LOCAL_VCPKG_PKG  2>&1 >> $VCPKG_ROOT/log.txt
    } else {
      & $VCPKG_NODE $VCPKG_NPM install --force --no-save --scripts-prepend-node-path=true https://aka.ms/vcpkg-ce.tgz  2>&1 >> $VCPKG_ROOT/log.txt
    }
    
  } else {
    & $VCPKG_NODE $VCPKG_NPM install --force --no-save --no-lockfile --scripts-prepend-node-path=true https://aka.ms/vcpkg-ce.tgz 2>&1 >> $VCPKG_ROOT/log.txt
  }
  if( $error.count -gt 0 ) {
    $error |% { add-content -encoding UTF8 $VCPKG_ROOT/log.txt $_ }
    $Error.clear()
  }

  # we should also copy the .bin files into the $VCPKG_ROOT folder to make reactivation (without being on the PATH) easy
  copy-item ./node_modules/.bin/ce.* 

  # Copy the NOTICE and LICENSE files to $VCPKG_ROOT to improve discoverability.
  copy-item ./node_modules/@microsoft/vcpkg-ce/NOTICE.txt
  copy-item ./node_modules/@microsoft/vcpkg-ce/LICENSE.txt

  popd

  if( -not (test-path $VCPKG_MODULE )) {
    write-error "ERROR! Unable to find/get vcpkg-ce module $VCPKG_MODULE"
    return $false;
  }
  return $true;
}

# ensure it's there.
$shh = new-item -type directory $VCPKG_ROOT -ea 0

if( -not (bootstrap-node )) {
  return 1;
}

if( -not (bootstrap-vcpkg-ce )) { 
  return 1
}

# export vcpkg-ce to the current shell.
$shh = New-Module -name vcpkg-ce -ArgumentList @($VCPKG_NODE,$VCPKG_MODULE,$VCPKG_ROOT) -ScriptBlock { 
  param($VCPKG_NODE,$VCPKG_MODULE,$VCPKG_ROOT) 

  function resolve { 
      param ( [string] $name )
      $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
      if (-not($name)) { return $_err[0].TargetObject }
      $Error.clear()
      return $name
  }

  function ce() { 
    if( ($args.indexOf('--remove-ce') -gt -1) -or ($args.indexOf('--reset-ce') -gt -1)) {
      # we really want to do call the ps1 script to do this.
      if( test-path "${VCPKG_ROOT}/ce.ps1" ) {
        & "${VCPKG_ROOT}/ce.ps1" @args
      }
      return
    }

    if( -not (test-path $VCPKG_MODULE )) {
      write-error "vcpkg-ce is not installed."
      write-host -nonewline "You can reinstall vcpkg-ce by running "
      write-host -fore green "iex (iwr -useb aka.ms/install-ce.ps1)"
      return
    }

    # setup the postscript file
    # Generate 31 bits of randomness, to avoid clashing with concurrent executions.
    $env:VCPKG_POSTSCRIPT = resolve "${VCPKG_ROOT}/VCPKG_tmp_$(Get-Random -SetSeed $PID).ps1"

    & $VCPKG_NODE --harmony $VCPKG_MODULE @args  

    # dot-source the postscript file to modify the environment
    if ($env:VCPKG_POSTSCRIPT -and (Test-Path $env:VCPKG_POSTSCRIPT)) {
      # write-host (get-content -raw $env:VCPKG_POSTSCRIPT)
      $postscr = get-content -raw $env:VCPKG_POSTSCRIPT
      if( $postscr ) {
        iex $postscr
      }
      Remove-Item -Force $env:VCPKG_POSTSCRIPT
      remove-item -ea 0 -force env:VCPKG_POSTSCRIPT
    }
  }  
}

# finally, if this was run with some arguments, then let's just pass it
if( $args.length -gt 0 ) {
  ce @args
}

return 
<# 
:set 
set ARGZ[%i%]=%1&set /a i+=1 & goto :eof

:unset 
set %1=& goto :eof

:init
if exist $null erase $null

:: do anything we need to before calling into powershell
if exist $null erase $null 

IF "%VCPKG_ROOT%"=="" SET VCPKG_ROOT=%USERPROFILE%\.ce

if exist %~dp0node_modules\@microsoft\vcpkg-ce\package.json ( 
  :: we're running the wrapper script for a module-installed vcpkg-ce
  set VCPKG_CMD=%~dpf0
  set VCPKG_SCRIPT=%~dp0node_modules\@microsoft\vcpkg-ce
  goto INVOKE
)

:: we're running vcpkg-ce from the ce home folder
set VCPKG_CMD=%VCPKG_ROOT%\node_modules\@microsoft\vcpkg-ce\ce.cmd

:: if we're being asked to reset the install, call bootstrap
if "%1" EQU "--reset-ce" goto BOOTSTRAP

:: if we're being asked to remove the install, call bootstrap
if "%1" EQU "--remove-ce" ( 
  set REMOVE_CE=TRUE
  doskey ce=
  goto BOOTSTRAP
)

:: do we even have it installed?
if NOT exist "%VCPKG_CMD%" goto BOOTSTRAP

set VCPKG_SCRIPT="%VCPKG_ROOT%\node_modules\@microsoft\vcpkg-ce"

:: if this is the actual installed vcpkg-ce, let's get to the invocation
if "%~dfp0" == "%VCPKG_CMD%" goto INVOKE

:: this is not the 'right' ce cmd, let's forward this on to that one.
call %VCPKG_CMD% %*
set VCPKG_EXITCODE=%ERRORLEVEL%
goto :eof

:INVOKE
:: Generate 30 bits of randomness, to avoid clashing with concurrent executions.
SET /A VCPKG_POSTSCRIPT=%RANDOM% * 32768 + %RANDOM%
SET VCPKG_POSTSCRIPT=%VCPKG_ROOT%\VCPKG_tmp_%VCPKG_POSTSCRIPT%.cmd

:: find the right node
if exist %VCPKG_ROOT%\cache\bin\node.exe set VCPKG_NODE=%VCPKG_ROOT%\cache\bin\node.exe
if "%VCPKG_NODE%" EQU "" ( 
  for %%i in (node.exe) do set VCPKG_NODE=%%~$PATH:i      
)
if "%VCPKG_NODE%" EQU "" goto OHNONONODE:

:: call the program
"%VCPKG_NODE%" --harmony "%VCPKG_SCRIPT%" %* 
set VCPKG_EXITCODE=%ERRORLEVEL%
doskey ce="%VCPKG_CMD%" $*

:POSTSCRIPT
:: Call the post-invocation script if it is present, then delete it.
:: This allows the invocation to potentially modify the caller's environment (e.g. PATH).
IF NOT EXIST "%VCPKG_POSTSCRIPT%" GOTO :fin
CALL "%VCPKG_POSTSCRIPT%"
DEL "%VCPKG_POSTSCRIPT%"

goto :fin

:OHNONONODE
set VCPKG_EXITCODE=1
echo "Unable to find the nodejs for ce to run."
goto fin:

:BOOTSTRAP
:: add the cmdline args to the environment so powershell can use them
set /a i=0 & for %%a in (%*) do call :set %%a 

set POWERSHELL_EXE=
for %%i in (pwsh.exe powershell.exe) do (
  if EXIST "%%~$PATH:i" set POWERSHELL_EXE=%%~$PATH:i & goto :gotpwsh
)
:gotpwsh

"%POWERSHELL_EXE%" -noprofile -executionpolicy unrestricted -command "iex (get-content %~dfp0 -raw)#" &&  set REMOVE_CE=
set VCPKG_EXITCODE=%ERRORLEVEL%

:: clear out the argz
@for /f "delims==" %%_ in ('set ^|  findstr -i argz') do call :unset %%_

:: if we're being asked to remove it,we're done.
if "%REMOVE_CE%" EQU "TRUE" ( 
  goto :fin
)

:CREATEALIAS
doskey ce="%VCPKG_ROOT%\node_modules\.bin\ce.cmd" $*

:fin
SET VCPKG_POSTSCRIPT=
SET VCPKG_CMD=
set VCPKG_NODE=

EXIT /B %VCPKG_EXITCODE%
goto :eof
#>