# Shopify Theme Development Commands

This document lists essential commands for developing, testing, and managing this Shopify theme locally using the Shopify CLI.

---

## 1. Local Development & Preview

Start a local development server with hot-reloading connected to your development store:

```bash
shopify theme dev --store <your-store-name>.myshopify.com
```

> **Note:** If you have already authenticated with your store in Shopify CLI, you can simply run:
> ```bash
> shopify theme dev
> ```

---

## 2. Code Linting & Validation

Validate and check Liquid, JSON, and theme assets for syntax errors and best practice issues:

```bash
shopify theme check
```

Auto-correct fixable issues:
```bash
shopify theme check --auto-correct
```

---

## 3. Remote Store Sync

### Push Changes to Shopify
Upload your local theme code to a development or unpublished theme on your store:

```bash
shopify theme push --store <your-store-name>.myshopify.com
```

### Pull Changes from Shopify
Download the latest changes (e.g. customizations made in the Shopify Theme Editor) to your local environment:

```bash
shopify theme pull --store <your-store-name>.myshopify.com
```

---

## 4. Useful Utilities

* **Open Theme in Browser Preview:**
  ```bash
  shopify theme open
  ```

* **Package Theme for Release / Distribution:**
  ```bash
  shopify theme package
  ```

* **List All Themes on Store:**
  ```bash
  shopify theme list --store <your-store-name>.myshopify.com
  ```
