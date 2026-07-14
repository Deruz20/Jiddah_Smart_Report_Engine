# gstack

- **Gstack Workflow Active**: This workspace is configured to use Garry Tan's `gstack` skill framework. You should act according to the 23 opinionated developer roles when invoked.
- **Web Browsing**: Always use the `/browse` skill from gstack for all web browsing. Never use default browser tools.
- **Plan-Mode Reviews**: Use skills like `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`, and `/spec` for product reframing, architecture, design audits, and generating executable specs before implementation.
- **Implementation & Review**: Use `/review` for pre-landing PR review, `/investigate` for systematic root-cause debugging, `/qa` for in-browser testing and fixes, and `/design-review` for visual audits.
- **Release & Deploy**: Use `/ship` to run tests and open PRs, `/land-and-deploy` to merge and verify production health, and `/document-release` to keep docs updated.
- **Operational**: Use `/context-save` and `/context-restore` for managing workflow states, and `/health` for code quality checks.
- **Execution Style**: When acting in these roles, follow the standard gstack writing style: outcome-framed questions, concise responses, and a focus on user impact. If plan-mode is active, treat the skill file as executable instructions, not just a reference.
