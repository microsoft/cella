@(echo off) > $null 
if #ftw NEQ '' goto :CMDSTART
($true){}

# powershell script starts here 

# unpack arguments if they cam from CMD
if( ($ENV:ARGZ) -and ($ENV:ARGZ.length -gt 1)  ) {
  $Q=$ENV:ARGZ -replace "^(.*?),.*", '$1'
  if( $ENV:ARGZ.length -gt $q.length) {
    $tmp=(($ENV:ARGZ.substring($q.length+1) -replace '"', '`"' ) -replace $Q,'"')
    $argz=invoke-expression "@($tmp)" # turn it into an array
  } else {
    $argz = @()
  }
} else {
  $argz=$args
}

# wrapper script for cella.
# this is intended to be dot-sourced and then you can use the cella() function

# GLOBALS
$CELLA_NODE_LATEST='14.16.0'
$CELLA_NODE_REMOTE='https://nodejs.org/dist/'
$CELLA_PWD=$pwd

$CELLA_START_TIME=get-date

# seconds since start
# (get-date).Subtract(($CELLA_START_TIME)).ticks/10000000

function resolve { 
    param ( [string] $name )
    $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
    if (-not($name)) { return $_err[0].TargetObject }
    return $name
}
$SCRIPT:DEBUG=$true
if( $argz.indexOf('--debug') -gt -1 ) {
  $SCRIPT:DEBUG=$true
}

function cella-debug() {
  if( $DEBUG ) { 
    $t = [int32]((get-date).Subtract(($CELLA_START_TIME)).ticks/10000)
    write-host -fore green "[$t msec] " -nonewline
    write-host -fore gray $args
  }
}

# set the home path. 
if( $ENV:CELLA_HOME ) { 
  $SCRIPT:CELLA_HOME=(resolve $ENV:CELLA_HOME)
  $ENV:CELLA_HOME=$CELLA_HOME
} else {
  $SCRIPT:CELLA_HOME=(resolve "$HOME/.cella")
  $ENV:CELLA_HOME=$CELLA_HOME
}

$reset = $argz -and $argz.IndexOf('--reset-cella') -gt -1 
$remove = $argz -and $argz.IndexOf('--remove-cella') -gt -1 

if( $reset -or -$remove ) {
  if( $reset ) {
    cella-debug "Resetting Cella"
  }

  remove-item -recurse -force -ea 0 "${CELLA_HOME}/node_modules"
  remove-item -recurse -force -ea 0 "${CELLA_HOME}/bin"
  remove-item -recurse -force -ea 0 "${CELLA_HOME}/lib"
  
  if( $remove ) { 
    cella-debug "Removing Cella"
    exit
  }
}

function verify-node() {
  param( $NODE ) 

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
      return $TRUE;  
    }
  }
  return $FALSE
}

function isWindows {
  if( ($PSVersionTable.OS -match "windows") -or ($PSVersionTable.PSEdition -match 'desktop') ) { 
    return $true;
  }
  return $false;
}

function bootstrap-node {
  # check the node on the path.
  if( (verify-node ((get-command node -ea 0).source ))) {
    cella-debug "Node: ${CELLA_NODE}"
    return $TRUE;
  }

  if( (verify-node (resolve "${CELLA_HOME}/cache/bin/node"))) {
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
      $shh= expand-archive -path $NODE_ARCHIVE -destinationpath "${CELLA_HOME}/cache" 
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

  if( isWindows ) {
    $shh = & $CELLA_NODE $CELLA_NPM install --force --no-save --no-lockfile c:\tmp\cella-0.0.1.tgz  
  } else {
    cella-debug  $CELLA_NODE $CELLA_NPM install --force --no-save --no-lockfile /mnt/c/tmp/cella-0.0.1.tgz  
    $shh = & $CELLA_NODE $CELLA_NPM  install --force --no-save --no-lockfile  /mnt/c/tmp/cella-0.0.1.tgz  
  }

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
      return $name
  }

  function cella() { 
    # setup the postscript file
    # Generate 31 bits of randomness, to avoid clashing with concurrent executions.
    $env:CELLA_POSTSCRIPT = resolve "${CELLA_HOME}/cella_tmp_${(Get-Random -SetSeed $PID)}.ps1"
    # write-host PS: $ENV:CELLA_POSTSCRIPT
    # write-host ARGS: $argz

    & $CELLA_NODE $CELLA_MODULE @args  

    # dot-source the postscript file to modify the environment
    if ($env:CELLA_POSTSCRIPT -and (Test-Path $env:CELLA_POSTSCRIPT)) {
      # write-host (get-content -raw $env:CELLA_POSTSCRIPT)
      . $env:CELLA_POSTSCRIPT
      Remove-Item -Force $env:CELLA_POSTSCRIPT
      remove-item -ea 0 -force env:CELLA_POSTSCRIPT
    }
  }  
}

# finally, if this was run with some arguments, then let's just pass it
if( $argz ) {
  cella @argz
}

return 
<# 
:CMDSTART
:: do anything we need to before calling into powershell
if exist $null erase $null 

IF "%CELLA_HOME%"=="" SET CELLA_HOME=%USERPROFILE%\.cella
set CELLA_CMD=%CELLA_HOME%\node_modules\.bin\cella.cmd

:: if we're being asked to reset the install, call bootstrap
if "%1" EQU "--reset-cella" goto BOOTSTRAP

:: if we're being asked to remove the install, call bootstrap
if "%1" EQU "--remove-cella" ( 
  set REMOVE_CELLA=TRUE
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
if exist %CELLA_HOME%\bin\node.exe set CELLA_NODE=%CELLA_HOME%\bin\node.exe
if "%CELLA_NODE%" EQU "" ( 
  for %%i in (node.exe) do set CELLA_NODE=%%~$PATH:i      
)
if "%CELLA_NODE%" EQU "" goto OHNONONODE:

:: call the program
"%CELLA_NODE%" "%CELLA_HOME%\node_modules\cella" %* 
set CELLA_EXITCODE=%ERRORLEVEL%

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
:: start with a strange character that gets encoded funny
set ARGZ=⌂
:LOOP
if "%1" NEQ "" (
  :: append all the parameters to the string
  set ARGZ=%ARGZ%, ⌂%1⌂
  shift /1
  goto :LOOP
)

powershell -noprofile -executionpolicy unrestricted "iex (get-content %~dfp0 -raw)#"
:: endlocal 
set CELLA_EXITCODE=%ERRORLEVEL%

:: if we're being asked to reset the install, call bootstrap
if "%REMOVE_CELLA%" EQU "TRUE" ( 
  :: remove any aliases
  set REMOVE_CELLA=
  doskey cella=
  goto :fin
)

:CREATEALIAS
:: doskey /m | findstr cella= 
:: IF %ERRORLEVEL% NEQ 0 
doskey cella="%CELLA_HOME%\node_modules\.bin\cella.cmd" $*

:fin
SET CELLA_POSTSCRIPT=
SET CELLA_CMD=
set CELLA_NODE=

EXIT /B %CELLA_EXITCODE%
goto :eof
#>