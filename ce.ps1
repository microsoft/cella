# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

$ENV:NODE_OPTIONS="--enable-source-maps"


function resolve { 
    param ( [string] $name )
    $name = Resolve-Path $name -ErrorAction 0 -ErrorVariable _err
    if (-not($name)) { return $_err[0].TargetObject }
    $Error.clear()
    return $name
}


if( $ENV:CE_HOME ) { 
  $SCRIPT:CE_HOME=(resolve $ENV:CE_HOME)
  $ENV:CE_HOME=$CE_HOME
} else {
  $SCRIPT:CE_HOME=(resolve "$HOME/.ce")
  $ENV:CE_HOME=$CE_HOME
}

# setup the postscript file
# Generate 31 bits of randomness, to avoid clashing with concurrent executions.
$env:CE_POSTSCRIPT = resolve "${CE_HOME}/ce_tmp_$(Get-Random -SetSeed $PID).ps1"

node $PSScriptRoot/cli @args  

# dot-source the postscript file to modify the environment
if ($env:CE_POSTSCRIPT -and (Test-Path $env:CE_POSTSCRIPT)) {
  # write-host (get-content -raw $env:CE_POSTSCRIPT)
  $content = get-content -raw $env:CE_POSTSCRIPT
  
  if( $content ) {
    iex $content 
  }
  Remove-Item -Force $env:CE_POSTSCRIPT
  remove-item -ea 0 -force env:CE_POSTSCRIPT
}

