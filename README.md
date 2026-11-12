# Keln for pi

Use [Keln](https://keln.ai) models in [pi](https://pi.dev) through Keln's OpenAI-compatible API at
`https://api.keln.ai/v1`.

Keln is an inference platform for open models. Keln maintains this package. It is not affiliated with
pi or Earendil.

## Install

```bash
pi install npm:pi-keln-provider
```

## Configure

1. Sign up at [app.keln.ai](https://app.keln.ai/signup). Open **Keys** → **Create key** and copy the
   key.
2. Set `KELN_API_KEY` in your environment, or run `/login` in pi and choose **Keln**.
3. Run `/model` and pick a Keln model, for example `keln/zai-org/glm-5.3`.

## Models

The package reads Keln's live catalog from `https://api.keln.ai/v1/models` at startup and on model
refresh, so the list, context windows, image input, prices and thinking levels always match Keln.
Models that don't write text, such as decision, embedding and reranker models, are left out.

- **Thinking:** `/thinking` offers the levels each model publishes. `off` is available on models that
  can turn reasoning off.
- **Output:** pi asks for up to 32,768 output tokens by default. The limit covers reasoning and the
  answer together, and prompt plus output must fit the model's context window.

Prices are on [Models & pricing](https://docs.keln.ai/models-pricing/).

## Security and footprint

- **Network:** pi sends your requests, including prompts, images and tool definitions, to
  `https://api.keln.ai` using your Keln key. See
  [Privacy & zero data retention](https://docs.keln.ai/capabilities/privacy/).
- **Code:** one extension file that registers the `keln` provider and reads the public model catalog. It
  has no runtime dependencies and sends no telemetry.

## Remove

```bash
pi remove npm:pi-keln-provider
```

## License

MIT
