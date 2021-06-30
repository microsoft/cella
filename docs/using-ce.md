# Using Project `ce`

## Summary

While the usage of `ce` is the same on all platforms, the installation/loading/removal is slightly different depending on the platform you're using.

`ce` doesn't persist any changes to the environment, nor does it automatically add itself to the start-up environment. If you wish to make it load in a window, you can just execute the script. Putting that in your profile will load it in every new window.

<hr>

# Platform-specific instructions:

### ![powershell](./imgs/ps1.png) &nbsp; PowerShell/Windows PowerShell 

#### **Installation**
From PowerShell and Windows PowerShell you can install `ce` with the following command:

``` powershell 
iex (iwr -useb aka.ms/ce.ps1)
```

#### **Loading** `ce` in another window.

After you've installed `ce`, you can load it in a new window with the following powershell command:

``` powershell
~/.ce/ce.ps1 
```

#### **Removal**

`ce` can easily be removed by just removing the installation folder:

``` powershell
rmdir -recurse -force ~/.ce
```

<hr>

### ![cmd](./imgs/cmd.png) &nbsp; Windows CMD

#### **Installation**

From CMD you can install `ce` with the following command on Windows 10 (curl is built in now!): 

``` bash
curl -L aka.ms/ce.cmd -o ce.cmd && ce.cmd
```

#### **Loading** `ce` in another window.

In a CMD window, you can just run the `ce.cmd` to run it.

``` powershell
%userprofile%\.ce\ce.cmd
```

#### **Removal**

`ce` can easily be removed by just removing the installation folder:

``` powershell
rmdir /s /q %USERPROFILE%/.ce
```

<hr>

#### ![posix](./imgs/posix.png) &nbsp; POSIX shells (Linux, OSX, etc)

#### **Installation**

From a POSIX shell (like `bash` or `zsh` ) you should be able to install `ce` with one of the following commands:

  - `. <(curl aka.ms/ce.sh -L )`  

  - `. <(wget aka.ms/ce.sh -q -O -)`
  
  - if those don't work well, try bringing the file local and dot-sourcing it.  
    `wget aka.ms/ce.sh -q && . ./ce.sh` 

Ain't dot-sourcing fun?

#### **Loading** `ce` in another window.

In a POSIX shell window (ie `bash` or `zsh`), you can just dot-source the `ce` script to run it.

``` bash
. ~/.ce/ce
```

#### **Removal**

`ce` can easily be removed by just removing the installation folder:

``` powershell
rm -rf ~/.ce
```

<hr>

# Using the command line

Once you have `ce` installed, you can use the command line to get help information on the commands provided:

``` powershell
ce --help 
```

![ce help](./imgs/help.png)



<style>
hr {
  height: 1px; 
  border:0;
  background: #333; 
}
h3 {
  border-color: #333; 
   display: flex;
  align-items: center;
}

h2 {
  display: flex;
  align-items: center;
}
</style>