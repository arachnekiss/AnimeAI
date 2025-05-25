{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.vite
    pkgs.ffmpeg
    pkgs.git
    pkgs.python3
    pkgs.python3Packages.pip
  ];
  
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc
      pkgs.openssl
      pkgs.ffmpeg
    ];
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    PYTHON_PATH = "${pkgs.python3}/bin/python";
  };
}
