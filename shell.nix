# ATTENTION
# NixOS is not fully supported, some configuration may be necessary, see comments below

# pinned to nixos-24.05 on commit https://github.com/NixOS/nixpkgs/commit/759537f06e6999e141588ff1c9be7f3a5c060106
with import
  (builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/759537f06e6999e141588ff1c9be7f3a5c060106.tar.gz";
    sha256 = "1an5d5a68ip1bk0l7375jwlrnmg1q9iaxjwymi11z76k4kqch0r9";
  })
{ };

let
  # unstable packages
  # ATTENTION: this does not match the actual required version defined in packages/suite-desktop/package.json
  # (the required version is not yet in NixOS repository)
  electron = electron_31;
  nodejs = nodejs_22;
  # use older gcc. 10.2.0 with glibc 2.32 for node_modules bindings.
  # electron-builder is packing the app with glibc 2.32, bindings should not be compiled with newer version.
  gccPkgs = import (builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/a78ed5cbdd5427c30ca02a47ce6cccc9b7d17de4.tar.gz";
    sha256 = "0l5b1libi46sc3ly7a5vj04098f63aj5jynxpz44sb396nncnivl";
  }) {};
in
  stdenvNoCC.mkDerivation {
    name = "trezor-suite-dev";
    buildInputs = [
      bash
      git-lfs
      gnupg
      mdbook
      xorg.xhost     # for e2e tests running on localhost
      docker         # for e2e tests running on localhost
      docker-compose # for e2e tests running on localhost
      nodejs
      yarn
      jre
      p7zip
      electron
      pkg-config
      pixman cairo giflib libjpeg libpng librsvg pango            # build dependencies for node-canvas
      shellcheck
    ] ++ lib.optionals stdenv.isLinux [
      appimagekit nsis openjpeg osslsigncode p7zip squashfsTools gccPkgs.gcc # binaries used by node_module: electron-builder
      udev  # used by node_module: usb
    ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
      Cocoa
      CoreServices
    ]);

    # used by patchelf for WabiSabiClientLibrary in dev mode (see webpack nixos-interpreter-plugin)
    NIX_PATCHELF_LIBRARY_PATH = "${openssl.out}/lib:${zlib}/lib:${gcc.cc.lib}/lib";
    NIX_CC="${gcc}";

    shellHook = ''
      export NODE_OPTIONS=--max_old_space_size=4096
      export CURDIR="$(pwd)"
      export PATH="$PATH:$CURDIR/node_modules/.bin"
      export ELECTRON_BUILDER_CACHE="$CURDIR/.cache/electron-builder"
    '' + lib.optionalString stdenv.isDarwin ''
      export ELECTRON_OVERRIDE_DIST_PATH="${electron}/Applications/"
    '' + lib.optionalString stdenv.isLinux ''
      export ELECTRON_OVERRIDE_DIST_PATH="${electron}/bin/"
      export npm_config_build_from_source=true  # tell yarn to not download binaries, but build from source
      export PLAYWRIGHT_BROWSERS_PATH="$CURDIR/.cache/ms-playwright"
    '';
  }
