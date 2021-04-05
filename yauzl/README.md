This is https://github.com/thejoshwolfe/yauzl at 96f0eb552c560632a754ae0e1701a7edacbda389 with the
following changes applied:
* examples and tests have been deleted
* https://github.com/thejoshwolfe/yauzl/pull/123 "Replace custom Stream.destroy() methods with inherited ones"
  This prevents yauzl from dropping errors on the floor and hanging Node.
* https://github.com/thejoshwolfe/yauzl/pull/115 "[DEP0005] Replace fd-slicer dependency with fd-slicer2 fork"
  This resolves use of a deprecated API.
