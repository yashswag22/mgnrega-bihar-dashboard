# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploy to GitHub Pages

1. Create a repository on GitHub (call it e.g. `mgnrega-bihar-dashboard`).
2. Add the remote and push your code (from project root):

	git init
	git add .
	git commit -m "Initial commit"
	git branch -M main
	git remote add origin https://github.com/<your-username>/<your-repo>.git
	git push -u origin main

3. The repository contains a GitHub Actions workflow at `.github/workflows/deploy-gh-pages.yml` that will build the app and publish the `dist` folder to the `gh-pages` branch when you push to `main`.

4. After the action completes, go to your repo Settings → Pages and ensure the source is set to the `gh-pages` branch. The site URL will be shown there.

Notes:
- If your repository uses a different default branch, update the workflow's `on.push.branches` accordingly.
- The action uses the built-in `GITHUB_TOKEN`, no extra secret is required for basic publishing.

