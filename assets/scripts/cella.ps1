@(echo off) > $null 
if #ftw NEQ '' goto :init
($true){ $Error.clear(); }

# wrapper script for cella.
# this is intended to be dot-sourced and then you can use the cella() function

# unpack arguments if they came from CMD
$hash=@{}; 
get-item env:argz* |% { $hash[$_.name] = $_.value }
if ($hash.count -gt 0) { 
  $args=for ($i=0; $i -lt $hash.count;$i++) { $hash["ARGZ[$i]"] }
}
# force the array to be an arraylist since we like to mutate it.
$args=[System.Collections.ArrayList][System.Array]$args

# GLOBALS
$CELLA_NODE_LATEST='14.16.0'
$CELLA_NODE_REMOTE='https://nodejs.org/dist/'
$CELLA_PWD=$pwd

$CELLA_START_TIME=get-date

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

function cella-debug() {
  $t = [int32]((get-date).Subtract(($CELLA_START_TIME)).ticks/10000)
  if($SCRIPT:DEBUG) { 
    write-host -fore green "[$t msec] " -nonewline
    write-host -fore gray $args
  }
  
  write-output "[$t msec] $args" >> $CELLA_HOME/log.txt
}

# set the home path. 
if( $ENV:CELLA_HOME ) { 
  $SCRIPT:CELLA_HOME=(resolve $ENV:CELLA_HOME)
  $ENV:CELLA_HOME=$CELLA_HOME
} else {
  $SCRIPT:CELLA_HOME=(resolve "$HOME/.cella")
  $ENV:CELLA_HOME=$CELLA_HOME
}

$reset = $args.IndexOf('--reset-cella') -gt -1 
$remove = $args.IndexOf('--remove-cella') -gt -1 

if( $reset -or -$remove ) {
  $args.remove('--reset-cella');
  $args.remove('--remove-cella');

  if( $reset ) {
    write-host "Resetting Cella"
  }

  remove-item -recurse -force -ea 0 "${CELLA_HOME}/node_modules"
  remove-item -recurse -force -ea 0 "${CELLA_HOME}/bin"
  remove-item -recurse -force -ea 0 "${CELLA_HOME}/lib"
  remove-item -force -ea 0 "${CELLA_HOME}/cella.ps1"
  remove-item -force -ea 0 "${CELLA_HOME}/cella.cmd"
  remove-item -force -ea 0 "${CELLA_HOME}/cella"  
  $error.clear();

  if( $remove ) { 
    write-host "Removing Cella"
    exit
  }
}

function verify-node() {
  param( $NODE ) 

  if( $NODE ) {
    if( get-command -ea 0 $NODE ) {
      if( (& $NODE -e "[major, minor, patch ] = process.versions.node.split('.'); console.log( major>14 || major == 14 & minor >= 15)") -gt 0 ) {
        # good version of node
        # set the variables 

        $SCRIPT:CELLA_NODE=$NODE
        if( isWindows ) {
          $SCRIPT:CELLA_NPM=resolve "${CELLA_NODE}\..\node_modules\npm"
        } else {
          $SCRIPT:CELLA_NPM=resolve "${CELLA_NODE}\..\npm"
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
  # if we have a custom cella node let's use that first
  if( (verify-node (resolve "${CELLA_HOME}/cache/bin/node"))) {
    cella-debug "Node: ${CELLA_NODE}"
    return $TRUE;
  }

  # check the node on the path.
  if( (verify-node ((get-command node -ea 0).source ))) {
    cella-debug "Node: ${CELLA_NODE}"
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

  $NODE_FULLNAME="node-v${CELLA_NODE_LATEST}-${NODE_OS}-${NODE_ARCH}"
  $NODE_URI="${CELLA_NODE_REMOTE}v${CELLA_NODE_LATEST}/${NODE_FULLNAME}${NODE_ARCHIVE_EXT}"
  $NODE_ARCHIVE= resolve "${CELLA_HOME}/cache/${NODE_FULLNAME}${NODE_ARCHIVE_EXT}"

  $shh = new-item -type directory  "${CELLA_HOME}/cache" -ea 0
  
  $ProgressPreference = 'SilentlyContinue'
  cella-debug "Downloading Node: ${NODE_URI}"
  invoke-webrequest -Uri $NODE_URI -outfile $NODE_ARCHIVE 

  switch($NODE_OS){
    'win' { 
      if( get-command -ea 0 tar.exe ) {
        tar "-xvf" "${NODE_ARCHIVE}" -C "${CELLA_HOME}/cache"  2>&1  > $null
      } else {
        $shh= expand-archive -path $NODE_ARCHIVE -destinationpath "${CELLA_HOME}/cache" 
      }
      move-item "${CELLA_HOME}/cache/${NODE_FULLNAME}" "${CELLA_HOME}/cache/bin" 
    }
    'aix' { 
      $shh = gunzip "${NODE_ARCHIVE}" | tar -xvC "${CELLA_HOME}/cache" "${NODE_FULLNAME}/bin/${NODE_EXE}" 
      move-item "${CELLA_HOME}/cache/${NODE_FULLNAME}/bin" "${CELLA_HOME}/cache/" 
      move-item "${CELLA_HOME}/cache/${NODE_FULLNAME}/lib" "${CELLA_HOME}/cache/"  
      remove-item "${CELLA_HOME}/cache/${NODE_FULLNAME}" -force -recurse 
    } 
    default { 
      $shh = tar "-zxvf" "${NODE_ARCHIVE}" -C "${CELLA_HOME}/cache"  
      move-item "${CELLA_HOME}/cache/${NODE_FULLNAME}/bin" "${CELLA_HOME}/cache/" 
      move-item "${CELLA_HOME}/cache/${NODE_FULLNAME}/lib" "${CELLA_HOME}/cache/"   
      remove-item "${CELLA_HOME}/cache/${NODE_FULLNAME}" -force -recurse 
    } 
  }

  if( (verify-node (resolve "${CELLA_HOME}/cache/bin/node"))) {
    cella-debug "Node: ${CELLA_NODE}"
    return $TRUE;
  }

  write-error 'Unable to resolve nodejs'
  return $FALSE; 
}


function bootstrap-cella {
  $SCRIPT:CELLA_SCRIPT=(resolve ${CELLA_HOME}/node_modules/.bin/cella.ps1)
  $SCRIPT:CELLA_MODULE=(resolve ${CELLA_HOME}/node_modules/cella )

  if( test-path $CELLA_SCRIPT ) {
    return $TRUE;
  }

  cella-debug "Bootstrapping Cella: ${CELLA_HOME}"

  # ensure we have a node_modules here, so npm won't search for one up the tree.
  $shh = new-item -type directory -ea 0 $CELLA_HOME/node_modules
  pushd $CELLA_HOME
  
  $shh = & $CELLA_NODE $CELLA_NPM cache clean --force 2>&1 
  $error.clear();

  write-host "Installing Cella to ${CELLA_HOME}"

  if( isWindows ) {
    if( $USE_LOCAL_CELLA_PKG ) {
      write-host -fore cyan Using Local Package: $USE_LOCAL_CELLA_PKG
      & $CELLA_NODE $CELLA_NPM install --force --no-save --scripts-prepend-node-path=true $USE_LOCAL_CELLA_PKG  2>&1 >> $CELLA_HOME/log.txt
    } else {
      & $CELLA_NODE $CELLA_NPM install --force --no-save --scripts-prepend-node-path=true https://aka.ms/cella.tgz  2>&1 >> $CELLA_HOME/log.txt
    }
    
  } else {
    & $CELLA_NODE $CELLA_NPM install --force --no-save --no-lockfile --scripts-prepend-node-path=true https://aka.ms/cella.tgz 2>&1 >> $CELLA_HOME/log.txt
  }
  if( $error.count -gt 0 ) {
    $error |% { add-content -encoding UTF8 $CELLA_HOME/log.txt $_ }
    $Error.clear()
  }


  # we should also copy the .bin files into the $CELLA_HOME folder to make reactivation (without being on the PATH) easy
  copy-item ./node_modules/.bin/cella.* 

  popd

  if( -not (test-path $CELLA_MODULE )) {
    write-error "ERROR! Unable to find/get cella module $CELLA_MODULE"
    return $false;
  }
  return $true;
}

# ensure it's there.
$shh = new-item -type directory $CELLA_HOME -ea 0

if( -not (bootstrap-node )) {
  return 1;
}

if( -not (bootstrap-cella )) { 
  return 1
}

# export cella to the current shell.
$shh = New-Module -name cella -ArgumentList @($CELLA_NODE,$CELLA_MODULE,$CELLA_HOME) -ScriptBlock { 
  param($CELLA_NODE,$CELLA_MODULE,$CELLA_HOME) 

  function resolve { 
      param ( [string] $name )
      $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
      if (-not($name)) { return $_err[0].TargetObject }
      $Error.clear()
      return $name
  }

  function cella() { 
    if( ($args.indexOf('--remove-cella') -gt -1) -or ($args.indexOf('--reset-cella') -gt -1)) {
      # we really want to do call the ps1 script to do this.
      if( test-path "${CELLA_HOME}/cella.ps1" ) {
        & "${CELLA_HOME}/cella.ps1" @args
      }
      return
    }

    if( -not (test-path $CELLA_MODULE )) {
      write-error "Cella is not installed."
      write-host -nonewline "You can reinstall cella by running "
      write-host -fore green "iex (iwr -useb aka.ms/cella.ps1)"
      return
    }

    # setup the postscript file
    # Generate 31 bits of randomness, to avoid clashing with concurrent executions.
    $env:CELLA_POSTSCRIPT = resolve "${CELLA_HOME}/cella_tmp_$(Get-Random -SetSeed $PID).ps1"

    & $CELLA_NODE --harmony $CELLA_MODULE @args  

    # dot-source the postscript file to modify the environment
    if ($env:CELLA_POSTSCRIPT -and (Test-Path $env:CELLA_POSTSCRIPT)) {
      # write-host (get-content -raw $env:CELLA_POSTSCRIPT)
      $postscr = get-content -raw $env:CELLA_POSTSCRIPT
      if( $postscr ) {
        iex $postscr
      }
      Remove-Item -Force $env:CELLA_POSTSCRIPT
      remove-item -ea 0 -force env:CELLA_POSTSCRIPT
    }
  }  
}

# finally, if this was run with some arguments, then let's just pass it
if( $args.length -gt 0 ) {
  cella @args
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

IF "%CELLA_HOME%"=="" SET CELLA_HOME=%USERPROFILE%\.cella
set CELLA_CMD=%CELLA_HOME%\node_modules\.bin\cella.cmd

:: if we're being asked to reset the install, call bootstrap
if "%1" EQU "--reset-cella" goto BOOTSTRAP

:: if we're being asked to remove the install, call bootstrap
if "%1" EQU "--remove-cella" ( 
  set REMOVE_CELLA=TRUE
  doskey cella=
  goto BOOTSTRAP
)

:: do we even have it installed?
if NOT exist "%CELLA_CMD%" goto BOOTSTRAP

:: if this is the actual installed cella, let's get to the invocation
if "%~dfp0" == "%CELLA_CMD%" goto INVOKE

:: this is not the 'right' cella cmd, let's forward this on to that one.
call %CELLA_CMD% %*
set CELLA_EXITCODE=%ERRORLEVEL%
goto :eof

:INVOKE
:: Generate 30 bits of randomness, to avoid clashing with concurrent executions.
SET /A CELLA_POSTSCRIPT=%RANDOM% * 32768 + %RANDOM%
SET CELLA_POSTSCRIPT=%CELLA_HOME%\CELLA_tmp_%CELLA_POSTSCRIPT%.cmd

:: find the right node
if exist %CELLA_HOME%\cache\bin\node.exe set CELLA_NODE=%CELLA_HOME%\cache\bin\node.exe
if "%CELLA_NODE%" EQU "" ( 
  for %%i in (node.exe) do set CELLA_NODE=%%~$PATH:i      
)
if "%CELLA_NODE%" EQU "" goto OHNONONODE:

:: call the program
"%CELLA_NODE%" --harmony "%CELLA_HOME%\node_modules\cella" %* 
set CELLA_EXITCODE=%ERRORLEVEL%
doskey cella="%CELLA_HOME%\node_modules\.bin\cella.cmd" $*

:POSTSCRIPT
:: Call the post-invocation script if it is present, then delete it.
:: This allows the invocation to potentially modify the caller's environment (e.g. PATH).
IF NOT EXIST "%CELLA_POSTSCRIPT%" GOTO :CLEANUP
CALL "%CELLA_POSTSCRIPT%"
DEL "%CELLA_POSTSCRIPT%"

goto :fin

:OHNONONODE
set CELLA_EXITCODE=1
echo "Unable to find the nodejs for cella to run."
goto fin:

:BOOTSTRAP
:: add the cmdline args to the environment so powershell can use them
set /a i=0 & for %%a in (%*) do call :set %%a 

set POWERSHELL_EXE=
for %%i in (pwsh.exe powershell.exe) do (
  if EXIST "%%~$PATH:i" set POWERSHELL_EXE=%%~$PATH:i & goto :gotpwsh
)
:gotpwsh

"%POWERSHELL_EXE%" -noprofile -executionpolicy unrestricted -command "iex (get-content %~dfp0 -raw)#" &&  set REMOVE_CELLA=
set CELLA_EXITCODE=%ERRORLEVEL%

:: clear out the argz
@for /f "delims==" %%_ in ('set ^|  findstr -i argz') do call :unset %%_

:: if we're being asked to remove it,we're done.
if "%REMOVE_CELLA%" EQU "TRUE" ( 
  goto :fin
)

:CREATEALIAS
doskey cella="%CELLA_HOME%\node_modules\.bin\cella.cmd" $*

:fin
SET CELLA_POSTSCRIPT=
SET CELLA_CMD=
set CELLA_NODE=

EXIT /B %CELLA_EXITCODE%
goto :eof
#>