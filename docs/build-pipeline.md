# Official build and packaging process

Official builds happen in [a private Azure DevOps (ADO) pipeline](https://devdiv.visualstudio.com/DevDiv/_build?definitionId=14679&_a=summary) which is defined by the [azure-pipelines.yml](../azure-pipelines.yml) file in this repository. The build pipeline uses a private ADO instance (as opposed to GitHub actions) so that it can use several internal compliance-related build tasks, like automated scanners and signing.

## Creating a new release

To create a new real-signed release on GitHub:

1. Push a tag named `v` followed by the version number (e.g. `v0.1.0`) at the commit you want to release. This will automatically trigger a real-signed build and create a pre-release release on GitHub. You can [monitor build progress on ADO](https://devdiv.visualstudio.com/DevDiv/_build?definitionId=14679&_a=summary).
2. Once the build pipeline finishes, find the newly created GitHub release, perform any manual validation steps, and then manually switch the release from pre-release to a full release.

## Manually queueing a build

When diagnosing issues in the build pipeline, it can be useful to manually queue a build for a particular branch or commit without an associated pull request. This workflow also allows you to override the default signing type for diagnosing signing issues. To manually queue a build:

1. [Go to the ADO pipeline](https://devdiv.visualstudio.com/DevDiv/_build?definitionId=14679&_a=summary)
2. Click "Run Pipeline".
3. Select the desired branch, tag, or commit.
4. If desired, override the signing type. `default` will follow the rules described in the next section, and matches the behavior of automatically triggered builds. `test` or `real` will force test signing or real signing, respectively.
5. Click "Run".

## Steps in the build pipeline

The build pipeline is triggered whenever commits are pushed to the `main` branch, any tag is pushed, or a PR is opened targeting the `main` branch. The type of trigger determines the type of signing used in the build:

- Push to `main`: real signing
- Push tag: real signing
- Pull request: test signing

The pipeline follows these steps:

1. Set up signing based on the rules described above. **Note that due to security restrictions, this step will fail for pull requests opened from forks instead of branches.**
2. Run automated scanning for credentials and offensive or sensitive terms.
3. Install Node, then build and test the project. Refer to the pipeline YAML for exact steps. At this point all remaining steps are only for packaging and compliance.
4. Run a script to ensure that all first-party packages have a consistent, monotonically increasing version number, then collect all dependencies into a deployment directory.
5. For open-source license compliance, run Component Governance to detect all open-source components, then generate a NOTICE file and add it to the deployment directory.
6. Sign all first-party JavaScript and PowerShell files. [Third-party JavaScript currently cannot be signed](../.scripts/signing/SignFiles.proj). Signing happens in-place, replacing the unsigned files in the deployment directory and uses the signing type described above.
7. Run `npm pack` to create a final tgz in the output directory. Copy all the bootstrapping scripts to the output directory, including duplicating the PowerShell script with a `.cmd` extension. The same bootstrapping script supports both shells.
8. Create a security catalog (`.cat` file) containing the tgz and all bootstrapper scripts. Sign the catalog.
9. Publish all files in the output directory (bootstrapper scripts, tgz, and catalog) as an Azure Pipelines artifact. This artifact can be accessed by clicking the "x published" link under "Related" on an individual pipeline run.
10. Break the build if earlier scanning found any severe issues. Upload scanning logs to an internal service for automated work item creation. Note that log upload happens even if earlier pipeline steps failed so that we can catch issues even if the build does not succeed.
11. **Only if the pipeline was triggered by a tag**, create a new release on GitHub and add everything in the output directory (bootstrapper scripts, tgz, and catalog) as assets. This release will be marked as a pre-release.
