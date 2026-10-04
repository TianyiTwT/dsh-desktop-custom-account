import z from "@deepseek-ai/schemastery";

/**
 * The Host half of the custom-account plugin.
 *
 * It holds no behavior of its own: it exists so the package owns a Loader row
 * (the client module system serves a package's `./client` bundle only for an
 * enabled entry) and so the entry carries a Config. The three fields are
 * `volatile()`, which is what makes them live settings: the Host settings
 * document serves them to every client as the namespace named by this entry's
 * id, and the browser half reads and writes them through `ctx.configForms`.
 */
const Config = z.object({
  /** Master switch: when off, the official account row is left untouched. */
  enabled: z.boolean().default(true).volatile(),
  /** Replacement label for the sidebar account row ("" keeps the official one). */
  displayName: z.string().default("").volatile(),
  /** Replacement avatar: an https URL or a data: URL ("" keeps the official one). */
  avatar: z.string().default("").volatile(),
});

/**
 * Keep the settings document serving this entry's volatile fields while the
 * plugin ships its own page in the Plugins section.
 * @param ctx - the Host plugin context.
 */
function apply(ctx) {
  ctx.inject(["settings"], (scope) => {
    scope.effect(() => scope.settings.configure({ auto: false }, ctx.fiber));
  });
}

export { Config, apply };
