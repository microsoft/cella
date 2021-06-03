$ENV:NODE_OPTIONS="--enable-source-maps"


function resolve { 
    param ( [string] $name )
    $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
    if (-not($name)) { return $_err[0].TargetObject }
    $Error.clear()
    return $name
}


if( $ENV:CELLA_HOME ) { 
  $SCRIPT:CELLA_HOME=(resolve $ENV:CELLA_HOME)
  $ENV:CELLA_HOME=$CELLA_HOME
} else {
  $SCRIPT:CELLA_HOME=(resolve "$HOME/.cella")
  $ENV:CELLA_HOME=$CELLA_HOME
}

# setup the postscript file
# Generate 31 bits of randomness, to avoid clashing with concurrent executions.
$env:CELLA_POSTSCRIPT = resolve "${CELLA_HOME}/cella_tmp_$(Get-Random -SetSeed $PID).ps1"

node $PSScriptRoot/cli @args  

# dot-source the postscript file to modify the environment
if ($env:CELLA_POSTSCRIPT -and (Test-Path $env:CELLA_POSTSCRIPT)) {
  # write-host (get-content -raw $env:CELLA_POSTSCRIPT)
  $content = get-content -raw $env:CELLA_POSTSCRIPT
  
  if( $content ) {
    iex $content 
  }
  Remove-Item -Force $env:CELLA_POSTSCRIPT
  remove-item -ea 0 -force env:CELLA_POSTSCRIPT
}

