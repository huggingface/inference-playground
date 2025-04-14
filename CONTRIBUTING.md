# Contribute to 🤗 Playground

Everyone is welcome to contribute, and we value everybody's contribution. Code
contributions are not the only way to help the community. Answering questions, helping
others, and improving the documentation are also immensely valuable.

It also helps us if you spread the word! Reference the library in blog posts
about the awesome projects it made possible, shout out on Twitter every time it has
helped you, or simply ⭐️ the repository to say thank you.

However you choose to contribute, please be mindful and respect our
[code of conduct](https://github.com/huggingface/inference-playground/blob/main/CODE_OF_CONDUCT.md).

**This guide was heavily inspired by the awesome [scikit-learn guide to contributing](https://github.com/scikit-learn/scikit-learn/blob/main/CONTRIBUTING.md).**

## Ways to contribute

There are several ways you can contribute to 🤗 Playground:

- Fix outstanding issues with the existing code.
- Submit issues related to bugs or desired new features.
- Implement new models.
- Contribute to the examples or to the documentation.

> All contributions are equally valuable to the community. 🥰

## Fixing outstanding issues

If you notice an issue with the existing code and have a fix in mind, feel free to [start contributing](#create-a-pull-request) and open a Pull Request!

## Submitting a bug-related issue or feature request

Do your best to follow these guidelines when submitting a bug-related issue or a feature
request. It will make it easier for us to come back to you quickly and with good
feedback.

### Did you find a bug?

Before you report an issue, we would really appreciate it if you could **make sure the bug was not
already reported** (use the search bar on GitHub under Issues).

Once you've confirmed the bug hasn't already been reported, please include the following information in your issue so we can quickly resolve it:

- Your **OS type and version** and **Browser type and version**.
- A short, self-contained, code snippet that allows us to reproduce the bug in
  less than 30s.
- The _full_ traceback if an exception is raised.
- Attach any other additional information, like screenshots, you think may help.

To get the OS and software versions automatically, run the following command:

```bash
npx envinfo --system --binaries --browsers
```

### Do you want a new feature?

If there is a new feature you'd like to see in 🤗 Playground, please open an issue and describe:

1. What is the _motivation_ behind this feature? Is it related to a problem or frustration with the app? Is it something you worked on and think it could benefit the community?

   Whatever it is, we'd love to hear about it!

2. Describe your requested feature in as much detail as possible. The more you can tell us about it, the better we'll be able to help you.
3. Provide a _code snippet_ that demonstrates the features usage.
4. If the feature is related to a paper, please include a link.

If your issue is well written we're already 80% of the way there by the time you create it.

## Create a Pull Request

Before writing any code, we strongly advise you to search through the existing PRs or
issues to make sure nobody is already working on the same thing. If you are
unsure, it is always a good idea to open an issue to get some feedback.

You will need basic `git` proficiency to contribute to
🤗 Playground. While `git` is not the easiest tool to use, it has the greatest
manual. Type `git --help` in a shell and enjoy! If you prefer books, [Pro
Git](https://git-scm.com/book/en/v2) is a very good reference.

1. Fork the [repository](https://github.com/huggingface/inference-playground) by
   clicking on the **[Fork](https://github.com/huggingface/inference-playground/fork)** button on the repository's page. This creates a copy of the code
   under your GitHub user account.

2. Clone your fork to your local disk, and add the base repository as a remote:

   ```bash
   git clone git@github.com:<your Github handle>/inference-playground.git
   cd inference-playground
   git remote add upstream https://github.com/huggingface/inference-playground.git
   ```

3. Create a new branch to hold your development changes:

   ```bash
   git checkout -b a-descriptive-name-for-my-changes
   ```

   🚨 **Do not** work on the `main` branch!

4. Develop the features in your branch.

   Once you're happy with your changes, add the changed files with `git add` and
   record your changes locally with `git commit`:

   ```bash
   git add modified_file.svelte
   git commit
   ```

   Please remember to write [good commit
   messages](https://chris.beams.io/posts/git-commit/) to clearly communicate the changes you made!

   To keep your copy of the code up to date with the original
   repository, rebase your branch on `upstream/branch` _before_ you open a pull request or if requested by a maintainer:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

   Push your changes to your branch:

   ```bash
   git push -u origin a-descriptive-name-for-my-changes
   ```

   If you've already opened a pull request, you'll need to force push with the `--force` flag. Otherwise, if the pull request hasn't been opened yet, you can just push your changes normally.

5. Now you can go to your fork of the repository on GitHub and click on **Pull Request** to open a pull request. Make sure you tick off all the boxes on our [checklist](#pull-request-checklist) below. When you're ready, you can send your changes to the project maintainers for review.

6. It's ok if maintainers request changes, it happens to our core contributors
   too! So everyone can see the changes in the pull request, work in your local
   branch and push the changes to your fork. They will automatically appear in
   the pull request.

### Pull request checklist

☐ The pull request title should summarize your contribution.<br>
☐ If your pull request addresses an issue, please mention the issue number in the pull
request description to make sure they are linked (and people viewing the issue know you
are working on it).<br>
☐ To indicate a work in progress please prefix the title with `[WIP]`. These are
useful to avoid duplicated work, and to differentiate it from PRs ready to be merged.<br>

### Develop on Windows

On Windows (unless you're working in [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/) or WSL), you need to configure git to transform Windows `CRLF` line endings to Linux `LF` line endings:

```bash
git config core.autocrlf input
```

One way to run the `make` command on Windows is with MSYS2:

1. [Download MSYS2](https://www.msys2.org/), and we assume it's installed in `C:\msys64`.
2. Open the command line `C:\msys64\msys2.exe` (it should be available from the **Start** menu).
3. Run in the shell: `pacman -Syu` and install `make` with `pacman -S make`.
4. Add `C:\msys64\usr\bin` to your PATH environment variable.

You can now use `make` from any terminal (PowerShell, cmd.exe, etc.)! 🎉

### Sync a forked repository with upstream main (the Hugging Face repository)

When updating the main branch of a forked repository, please follow these steps to avoid pinging the upstream repository which adds reference notes to each upstream PR, and sends unnecessary notifications to the developers involved in these PRs.

1. When possible, avoid syncing with the upstream using a branch and PR on the forked repository. Instead, merge directly into the forked main.
2. If a PR is absolutely necessary, use the following steps after checking out your branch:

   ```bash
   git checkout -b your-branch-for-syncing
   git pull --squash --no-commit upstream main
   git commit -m '<your message without GitHub references>'
   git push --set-upstream origin your-branch-for-syncing
   ```
