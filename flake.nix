{
  description = "Preview C2PA content credentials on desktop";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    # TODO: all systems
    system = "aarch64-darwin";
    pkgs = import nixpkgs {
      inherit system;
    };
  in {
    devShells.${system}.default = pkgs.mkShell {
      nativeBuildInputs = with pkgs;
        [
          cargo-tauri

          libiconv
        ]
        ++ (with darwin.apple_sdk.frameworks; [
          Carbon
          WebKit
          UniformTypeIdentifiers
        ]);
    };
  };
}
