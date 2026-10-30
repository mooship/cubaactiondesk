# Contributing

Thank you for wanting to help. Cuba Action Desk SA gives South Africans a place to understand the US blockade of Cuba and do something about it, and it gets better every time someone checks a fact or fixes a link. Most of the useful help here involves no code.

You do not need permission to start. For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend your time.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Correct a fact.** Use the "Correct a fact" issue form. Give the page, what it says, what is right and a link to the source you read. Published fixes are logged on the [corrections page](https://cuba.timothybrits.co.za/corrections).
- **Suggest an organisation.** Use the "Suggest an organisation" form. It must pass the five checks on [How we check organisations](https://cuba.timothybrits.co.za/give/how-we-vet), so bring its registration number, its own donation page and evidence that it delivers.
- **Suggest someone to write to.** Use the "Suggest a recipient" form. We need an address, the page where it is published and the date you checked it.
- **Report a bug or a barrier.** Use the "Report a bug" form. Accessibility barriers count, and we want to hear about them.
- **Send a pull request.** Fix a typo, improve an explainer, add a test, or take on something from the issue list.

## Rules for written content

- Every claim in an article gets a `[[source-id]]` marker, and every source is a page you actually read. We prefer primary sources such as UN records and government documents. Cuban government sources are allowed and are labelled as such.
- Write British English in South African usage (organisation, programme, defence), in plain sentences for a reader aged 13 to 15.
- Message templates stay under 200 words and have at least two blanks for the sender to fill in.
- Nothing on the site may read as if a machine wrote it. The Writing section of [AGENTS.md](AGENTS.md) lists what to avoid, and it applies to every contributor.
- Do not reuse other groups' logos or artwork.

## Rules for code

Setup and commands are in the [README](README.md). The principles are in [AGENTS.md](AGENTS.md), which is written for people and for AI tools alike. In short:

- Write the failing test first for anything in `src/lib`. Match the code around your change, and build only what the change needs.
- Run the checks for what you changed. The "Done means" section of [AGENTS.md](AGENTS.md) lists them, and CI runs the same ones.
- Generated files (`public/_headers`, the link list, icons, images, profile pictures and migrations) are committed. Change the source, regenerate and commit both.
- Leave the Lefthook commit hook switched on.
- The site has no accounts, comments or mailing list, and it never handles money. It uses no client framework and no CSS framework, because the pages have to stay light on a prepaid phone. A change that breaks one of these needs a very good reason.

## Licences

Code is [MIT](LICENSE). Written content is [CC BY 4.0](LICENSE-CONTENT). By sending a contribution you confirm that you wrote it or have the right to share it, and that it can be used under those licences.

## Security

Report a vulnerability privately, as described in [SECURITY.md](SECURITY.md), and leave public issues for everything else.
