/*
 * Browser half of dsh-desktop-custom-account.
 *
 * DSH serves a package's `exports["./client"]` bundle to the browser for every
 * enabled Loader row, so this file is hand-written in the exact shape the
 * client module system expects: one `window.__ModuleLoader__.load` call whose
 * factory materializes the module on first import.
 *
 * It does two things:
 *   1. it registers this installed plugin's settings section on its own page of
 *      the Plugins list (`plugins.bundle.config`, keyed by the package name) and
 *      edits this entry's volatile settings through `ctx.configForms`;
 *   2. it keeps one live stylesheet in sync with those settings, which restyles
 *      the shipped sidebar account row (`settings.launcher`) with the custom
 *      avatar and display name.
 *
 * The official account plugin already occupies `settings.launcher` (a `single`
 * slot: a second registration throws), and the account profile it renders is
 * owned by the DeepSeek Platform. Presentation is therefore overridden in CSS
 * against the slot's own `data-slot` anchor, which survives React re-renders.
 */
window.__ModuleLoader__.load({
	id: "dsh-desktop-custom-account",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const h = react.createElement;

		/** This package's name; it is the key of the installed plugin's settings section. */
		const PACKAGE_NAME = "dsh-desktop-custom-account";
		/** Loader entry id; it is also this plugin's settings namespace. */
		const ENTRY_ID = "custom-account";
		/** Dictionary namespace owned by this plugin. */
		const NS = "customAccount";
		/** Live stylesheet identity inside the page. */
		const LIVE_CSS_ID = "dsh-desktop-custom-account/live.css";
		/** Panel stylesheet identity inside the page. */
		const PANEL_CSS_ID = "dsh-desktop-custom-account/panel.css";
		/** The slot anchor the shell renders around the sidebar account row. */
		const SEAT = '[data-slot="settings.launcher"]';
		/** The account launcher's own trigger button. */
		const TRIGGER = `${SEAT} button[aria-haspopup="menu"][data-signed-out="false"]`;
		/** Its avatar span (the first span child, signed in only). */
		const AVATAR = `${TRIGGER} > span:first-child`;
		/** Its label span (wide sidebar only). */
		const LABEL = `${TRIGGER}[data-collapsed="false"] > span:last-child`;
		/** Uploaded avatars are downscaled to this square size before they are stored. */
		const AVATAR_SIZE = 128;

		/** English copy. */
		const en = {
			title: "Account avatar & name",
			description: "Replace the avatar and display name in the sidebar account row.",
			summaryOff: "Official avatar and name",
			summaryOn: "Custom: ",
			avatarSet: "custom avatar",
			avatarOfficial: "official avatar",
			enabled: "Apply the custom avatar and name",
			enabledHint: "Turn off to leave the shipped account row exactly as it is.",
			displayName: "Display name",
			displayNameHint: "Shown in the sidebar account row. Leave empty to keep the official name.",
			avatar: "Avatar image",
			avatarHint: "An https link or a data: URL. Leave empty to keep the official avatar.",
			previewHint: "Pick a file to store a small square copy (128px), or paste a link below.",
			pickImage: "Choose image…",
			clearImage: "Remove image",
			overridden: "Overridden",
			reset: "Reset to official",
			invalid: "Use an https link or a data: URL, or leave empty.",
			save: "Save",
			saving: "Saving…",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			readOnly: "This deployment stores settings read-only.",
			unavailable: "This plugin is not loaded, so it cannot be configured right now.",
			imageFailed: "That file could not be read as an image."
		};
		/** Simplified Chinese copy. */
		const zh = {
			title: "账号头像与名称",
			description: "自定义侧栏左下角账号行的头像与显示名称。",
			summaryOff: "使用官方头像与名称",
			summaryOn: "已自定义：",
			avatarSet: "自定义头像",
			avatarOfficial: "官方头像",
			enabled: "启用自定义头像与名称",
			enabledHint: "关闭后完全保留官方账号行的显示。",
			displayName: "显示名称",
			displayNameHint: "显示在侧栏账号行；留空则保留官方名称。",
			avatar: "头像图片",
			avatarHint: "支持 https 链接或 data: URL；留空则保留官方头像。",
			previewHint: "可从本地选择图片（自动保存 128px 的方形小图），也可直接在下方粘贴图片链接。",
			pickImage: "选择图片…",
			clearImage: "移除图片",
			overridden: "已覆盖",
			reset: "恢复官方",
			invalid: "请填 https 链接或 data: URL；留空表示使用官方头像。",
			save: "保存",
			saving: "保存中…",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			readOnly: "本部署的设置为只读。",
			unavailable: "该插件当前未加载，暂时无法配置。",
			imageFailed: "无法把该文件读取为图片。"
		};

		//#region panel stylesheet
		const panelCss =
			'.dshca_toggle{display:flex;align-items:center;gap:8px;padding:4px 0 12px}' +
			'.dshca_previewRow{display:flex;align-items:center;gap:12px;padding:4px 0 16px}' +
			'.dshca_preview{box-sizing:border-box;flex:none;width:40px;height:40px;border-radius:50%;' +
			'background-color:var(--dsw-alias-bg-skeleton);background-position:center;background-repeat:no-repeat;background-size:cover}' +
			'.dshca_actions{display:flex;align-items:center;gap:8px;min-width:0}' +
			'.dshca_hint{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}';
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(PANEL_CSS_ID) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-desktop-custom-account";
			tag.dataset.pluginCss = PANEL_CSS_ID;
			tag.textContent = panelCss;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region live stylesheet
		/** Quote one CSS string literal, dropping characters a declaration cannot carry. */
		function cssString(value) {
			return '"' + String(value)
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				// eslint-disable-next-line no-control-regex
				.replace(/[\u0000-\u001f\u007f]/g, " ") + '"';
		}
		/** One CSS `url()` value. */
		function cssUrl(value) {
			return "url(" + cssString(value) + ")";
		}
		/** The active configuration, as the settings document serves it. */
		function readConfig(config) {
			const value = config === null || typeof config !== "object" ? {} : config;
			return {
				enabled: value.enabled !== false,
				displayName: typeof value.displayName === "string" ? value.displayName.trim() : "",
				avatar: typeof value.avatar === "string" ? value.avatar.trim() : ""
			};
		}
		/**
		 * Build the stylesheet that overrides the shipped account row.
		 * @param config - the entry's resolved settings.
		 * @returns CSS text, empty when nothing should be overridden.
		 */
		function liveCss(config) {
			const settings = readConfig(config);
			if (!settings.enabled || (settings.displayName === "" && settings.avatar === "")) return "";
			const rules = [];
			if (settings.displayName !== "") {
				rules.push(`${LABEL}{font-size:0}`);
				rules.push(`${LABEL}::after{content:${cssString(settings.displayName)};font-size:14px;line-height:22px}`);
			}
			if (settings.avatar !== "") {
				rules.push(`${AVATAR}{background-color:transparent;background-image:${cssUrl(settings.avatar)};background-position:center;background-repeat:no-repeat;background-size:cover}`);
				rules.push(`${AVATAR}>*{visibility:hidden}`);
			}
			return rules.join("");
		}
		/**
		 * Mount the live stylesheet once.
		 * @returns `sync` (rewrites it only when the CSS actually changed) and
		 * `dispose` (removes it, restoring the shipped row without DOM surgery).
		 */
		function mountLiveStyle() {
			if (typeof document === "undefined") return { sync: () => {}, dispose: () => {} };
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(LIVE_CSS_ID) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "dsh-desktop-custom-account";
				tag.dataset.pluginCss = LIVE_CSS_ID;
				document.head.appendChild(tag);
			}
			return {
				sync: (config) => {
					const css = liveCss(config);
					if (tag.textContent !== css) tag.textContent = css;
				},
				dispose: () => {
					tag.remove();
				}
			};
		}
		//#endregion

		//#region avatar upload
		/** Whether a downscaled square has any transparency left. */
		function isOpaque(pixels) {
			for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 255) return false;
			return true;
		}
		/**
		 * Read a picked file as a small square data URL: centred cover crop, PNG
		 * while transparency survives and JPEG otherwise, so the stored value
		 * stays a few kilobytes instead of hundreds.
		 * @param file - the file the user picked.
		 * @returns the data URL to store in the settings document.
		 */
		async function fileToAvatar(file) {
			const bitmap = await createImageBitmap(file);
			try {
				const canvas = document.createElement("canvas");
				canvas.width = AVATAR_SIZE;
				canvas.height = AVATAR_SIZE;
				const context = canvas.getContext("2d");
				if (context === null) throw new Error("canvas 2d context unavailable");
				const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
				const width = Math.max(1, Math.round(bitmap.width * scale));
				const height = Math.max(1, Math.round(bitmap.height * scale));
				context.drawImage(bitmap, Math.round((AVATAR_SIZE - width) / 2), Math.round((AVATAR_SIZE - height) / 2), width, height);
				const opaque = isOpaque(context.getImageData(0, 0, AVATAR_SIZE, AVATAR_SIZE).data);
				return opaque ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL("image/png");
			} finally {
				if (typeof bitmap.close === "function") bitmap.close();
			}
		}
		//#endregion

		//#region boolean field spec
		/**
		 * A checkbox field for the shared form model. `settingsTextField` cannot
		 * carry a boolean, so this spec parses the staged text into the boolean
		 * the Host Config declares.
		 * @param field - field name inside the namespace section.
		 * @returns the field's conversion spec.
		 */
		function settingsBooleanField(field) {
			return {
				field,
				format: (value) => value === true ? "true" : value === false ? "false" : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					if (trimmed === "true") return { kind: "set", value: true };
					if (trimmed === "false") return { kind: "set", value: false };
					return undefined;
				}
			};
		}
		//#endregion

		//#region installed plugin settings section
		/**
		 * This installed plugin's own settings section: the form the Plugins list
		 * renders on the package's page (`plugins.bundle.config`), plus a one-liner
		 * should a summary view ever ask for one.
		 * @param props - the requested view, locale copy, the form snapshot and its actions.
		 * @returns the one-liner, or the settings form.
		 */
		function CustomAccountCard(props) {
			const t = props.t;
			const state = props.useCustomAccount((snapshot) => snapshot);
			if (props.view === "summary") {
				const current = readConfig(state.effective);
				if (!current.enabled || (current.displayName === "" && current.avatar === "")) return t("summaryOff");
				return t("summaryOn") + (current.displayName === "" ? t("avatarSet") : current.displayName + " · " + t(current.avatar === "" ? "avatarOfficial" : "avatarSet"));
			}
			const disabled = !state.writable;
			const avatarText = state.avatar.text.trim();
			const fieldLabels = {
				overriddenLabel: t("overridden"),
				resetLabel: t("reset"),
				invalidLabel: t("invalid")
			};
			const pickImage = () => {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = "image/*";
				input.addEventListener("change", () => {
					const file = input.files?.[0];
					if (file === undefined) return;
					fileToAvatar(file).then((dataUrl) => {
						props.edit("avatar", dataUrl);
					}).catch((error) => {
						console.error("[custom-account] " + t("imageFailed"), error);
					});
				});
				input.click();
			};
			return h(primitives.SettingsForm, {
				labels: {
					unavailable: t("unavailable"),
					readOnly: t("readOnly"),
					saveFailed: t("saveFailed"),
					save: t("save"),
					saving: t("saving")
				},
				state,
				onSave: props.save,
				onDiscard: props.discard
			}, [
				h("div", { className: "dshca_toggle", key: "enabled" }, h(primitives.Checkbox, {
					checked: state.enabled.text !== "false",
					disabled,
					label: t("enabled"),
					title: t("enabledHint"),
					onChange: (checked) => {
						props.edit("enabled", checked ? "true" : "false");
					}
				})),
				h(primitives.SettingsValueField, {
					key: "displayName",
					id: "dshca-display-name",
					label: t("displayName"),
					hint: t("displayNameHint"),
					disabled,
					...fieldLabels,
					...state.displayName,
					onEdit: (text) => {
						props.edit("displayName", text);
					},
					onReset: () => {
						props.resetField("displayName");
					}
				}),
				h("div", { className: "dshca_previewRow", key: "preview" }, [
					h("span", {
						className: "dshca_preview",
						key: "image",
						style: avatarText === "" ? undefined : { backgroundImage: cssUrl(avatarText) }
					}),
					h("span", { className: "dshca_actions", key: "actions" }, [
						h(primitives.Button, {
							key: "pick",
							variant: "outline",
							disabled,
							onClick: pickImage,
							children: t("pickImage")
						}),
						avatarText === "" ? null : h(primitives.Button, {
							key: "clear",
							variant: "ghost",
							disabled,
							onClick: () => {
								props.edit("avatar", "");
							},
							children: t("clearImage")
						})
					]),
					h("p", { className: "dshca_hint", key: "hint" }, t("previewHint"))
				]),
				h(primitives.SettingsValueField, {
					key: "avatar",
					id: "dshca-avatar",
					label: t("avatar"),
					hint: t("avatarHint"),
					disabled,
					...fieldLabels,
					...state.avatar,
					onEdit: (text) => {
						props.edit("avatar", text);
					},
					onReset: () => {
						props.resetField("avatar");
					}
				})
			]);
		}
		//#endregion

		//#region plugin body
		/** Required client services. */
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		/**
		 * Mount the installed plugin's settings section and keep the live
		 * stylesheet in step with the settings document.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				en,
				zh
			}), "custom-account: dictionaries");
			const scope = ctx.configForms.get(ENTRY_ID);
			const form = new primitives.SettingsFormModel(scope, [
				settingsBooleanField("enabled"),
				primitives.settingsTextField("displayName"),
				primitives.settingsTextField("avatar")
			]);
			const store = form.bind(() => ({
				...form.shell(),
				enabled: form.field("enabled"),
				displayName: form.field("displayName"),
				avatar: form.field("avatar"),
				effective: scope.getSnapshot().value ?? {}
			}));
			ctx.effect(() => () => {
				form.dispose();
			}, "custom-account: form subscription");
			ctx.effect(() => {
				const live = mountLiveStyle();
				const sync = () => {
					live.sync(scope.getSnapshot().value);
				};
				const off = scope.subscribe(sync);
				sync();
				return () => {
					off();
					live.dispose();
				};
			}, "custom-account: sidebar account overrides");
			ctx.effect(() => ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: PACKAGE_NAME,
				locale: NS,
				inject: () => ({
					hooks: { customAccount: store },
					...form.actions()
				})
			}, CustomAccountCard)), "custom-account: installed plugin settings");
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
