---
title: Inference Playground
emoji: 🔋
colorFrom: blue
colorTo: pink
sdk: docker
pinned: false
app_port: 3000
---

<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/huggingface/inference-playground/raw/main/static/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/huggingface/inference-playground/raw/main/static/banner-light.svg">
    <img alt="Hugging Face Inference Playground" src="https://github.com/huggingface/inference-playground/raw/main/static/banner-light.svg"  height="100" style="max-width: 100%;">
  </picture>
</h1>

<p align="center">
    <a href="https://github.com/huggingface/inference-playground/actions/workflows/lint-and-test.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/huggingface/inference-playground/lint-and-test.yml?style=flat"></a>
    <a href="https://github.com/huggingface/inference-playground/blob/main/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/huggingface/inference-playground.svg?color=blue"></a>
    <a href="https://github.com/huggingface/transformers/blob/main/CODE_OF_CONDUCT.md"><img alt="Contributor Covenant" src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg"></a>
</p>

This application provides a user interface to interact with various large language models, leveraging the `@huggingface/inference` library. It allows you to easily test and compare models hosted on Hugging Face, connect to different third-party Inference Providers, and even configure your own custom OpenAI-compatible endpoints.

## Local Setup

TL;DR: After cloning, run `pnpm i && pnpm run dev --open`

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** Version 20 or later is recommended.
- **pnpm:** Install it globally via `npm install -g pnpm`.
- **Hugging Face Account & Token:** You'll need a free Hugging Face account and an access token to interact with models. Generate a token with at least `read` permissions from [hf.co/settings/tokens](https://huggingface.co/settings/tokens).

Follow these steps to get the Inference Playground running on your local machine:

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/huggingface/inference-playground.git
    cd inference-playground
    ```

2.  **Install Dependencies:**

    ```bash
    pnpm install
    ```

3.  **Start the Development Server:**

    ```bash
    pnpm run dev
    ```

4.  **Access the Playground:**
    - Open your web browser and navigate to `http://localhost:5173` (or the port indicated in your terminal).

## Features

- **Model Interaction:** Chat with a wide range of models available through Hugging Face Inference.
- **Provider Support:** Connect to various third-party inference providers (like Together, Fireworks, Replicate, etc.).
- **Custom Endpoints:** Add and use your own OpenAI-compatible API endpoints.
- **Comparison View:** Run prompts against two different models or configurations side-by-side.
- **Configuration:** Adjust generation parameters like temperature, max tokens, and top-p.
- **Session Management:** Save and load your conversation setups using Projects and Checkpoints.
- **Code Snippets:** Generate code snippets for various languages to replicate your inference calls.
- **Organization Billing:** Specify an organization to bill usage to for Team and Enterprise accounts.

## Organization Billing

For Team and Enterprise Hugging Face Hub organizations, you can centralize billing for all users by specifying an organization to bill usage to. This feature allows:

- **Centralized Billing:** All inference requests can be billed to your organization instead of individual user accounts
- **Usage Tracking:** Track inference usage across your organization from the organization's billing page
- **Spending Controls:** Organization administrators can set spending limits and manage provider access

### How to Use Organization Billing

1. **In the UI:** Navigate to the settings panel and enter your organization name in the "Billing Organization" field
2. **In Code Snippets:** Generated code examples will automatically include the billing organization parameter
3. **API Integration:** The playground will include the `X-HF-Bill-To` header in API requests when an organization is specified

### Requirements

- You must be a member of a Team or Enterprise Hugging Face Hub organization
- The organization must have billing enabled
- You need appropriate permissions to bill usage to the organization

For more information about organization billing, see the [Hugging Face documentation](https://huggingface.co/docs/inference-providers/pricing#billing-for-team-and-enterprise-organizations).

We hope you find the Inference Playground useful for exploring and experimenting with language models!
