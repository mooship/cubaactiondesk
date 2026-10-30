# Security policy

Cuba Action Desk SA is a volunteer project run by one person. We take security reports seriously and answer every one, though replies take days rather than hours.

The site promises visitors a few things: it never sees what they write, it never handles money, and its donation links go only to organisations we have checked. A report that shows one of those promises can be broken is the most useful kind.

## What is covered

- The live site and the Worker that serves it, including the `/go/[id]` redirect, the counter endpoints under `/api` and the rate limiter.
- The code in this repository, its CI workflow and its dependencies.

Other sites that share our Cloudflare zone are not covered, and neither are the sites we link to or the apps people use with our profile pictures. Please leave those alone.

## What we most want to hear about

- A way to make `/go/[id]` redirect somewhere we have not approved.
- A way to read or change what a visitor types into the Action Desk.
- A way to read or change the counter database.
- Script injection into any page, or a gap in the security headers set in `src/lib/security.ts`.
- A secret, token or personal detail committed to the repository.

## How to report

Use GitHub's private reporting: [open a private security report](https://github.com/mooship/cubaactiondesk/security/advisories/new). Only the maintainer can see it.

You can also email hello@cubaactiondesk.org.za with "Security" in the subject. Please do not open a public issue or post the details anywhere until we have fixed the problem.

Tell us what you found, where, how to reproduce it and what you think someone could do with it. A short report with clear steps is better than a long one.

## What happens next

- We aim to reply within 7 days.
- We will tell you whether we agree it is a problem, and keep you updated until it is fixed.
- When the fix is live we will publish an advisory. We will credit you by name or handle if you want that, and leave you out if you prefer.
- We cannot pay rewards, but we will thank you in public.

## Testing in good faith

We welcome research that follows these rules, and we will not take legal action against it.

- Test with your own browser and your own requests. Do not read, change or keep other people's data. If you reach data that is not yours, stop and tell us.
- Keep traffic low. The site is rate limited, and a flood only hurts the people trying to use it.
- No phishing, no social engineering and no physical attempts against anyone connected to the project.

## Supported versions

Only the current `main` branch and the live site receive fixes.
