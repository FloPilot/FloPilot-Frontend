/** Shopify-style storefront theme: pages, collections, and section widgets. */

export type StoreSectionType =
  | "hero"
  | "featured_collection"
  | "product_grid"
  | "rich_text"
  | "image_banner"
  | "collection_list"
  | "product_detail";

export type StoreHeroButtonLinkType =
  | "none"
  | "products"
  | "collection"
  | "page"
  | "url";

export type StoreSectionSettings = {
  title?: string;
  subtitle?: string;
  body?: string;
  /** Small overline above the hero heading (e.g. "Collection"). */
  eyebrow?: string;
  /** When true, the overline is hidden even if a legacy default would apply. */
  hideEyebrow?: boolean;
  buttonLabel?: string;
  /** Where the hero CTA navigates. Defaults to products when unset. */
  buttonLinkType?: StoreHeroButtonLinkType;
  /** page.id or collection.id when buttonLinkType is page/collection */
  buttonLinkTargetId?: string;
  /** External or absolute path when buttonLinkType is url */
  buttonUrl?: string;
  buttonOpenInNewTab?: boolean;
  imageUrl?: string;
  collectionId?: string;
  /** all | collection */
  productSource?: "all" | "collection";
  columns?: 2 | 3 | 4;
  textAlign?: "left" | "center" | "right";
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number;
  /** Product card media background: auto from mockup corners, or a fixed color. */
  cardBackgroundMode?: "auto" | "custom";
  cardBackgroundColor?: string;
  /** none | soft | medium | strong */
  cardShadow?: "none" | "soft" | "medium" | "strong";
};

export type ClientStoreSection = {
  id: string;
  type: StoreSectionType;
  enabled: boolean;
  sortOrder: number;
  settings: StoreSectionSettings;
};

export type ClientStoreCollectionRuleField = "tag";

export type ClientStoreCollectionRuleOperator = "equals";

export type ClientStoreCollectionRule = {
  id: string;
  field: ClientStoreCollectionRuleField;
  operator: ClientStoreCollectionRuleOperator;
  value: string;
};

export type ClientStoreCollectionSelectionType = "manual" | "smart";

export type ClientStoreCollection = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  /** Manual picks vs smart rules (tag matching). Defaults to manual. */
  selectionType?: ClientStoreCollectionSelectionType;
  /**
   * Manual membership, or for smart collections an optional display order.
   * Smart membership still comes from rules; ids here pin sort order.
   */
  productIds: string[];
  /** Products excluded from a smart collection. */
  excludedProductIds?: string[];
  /** Smart collection conditions (currently product tag). */
  rules?: ClientStoreCollectionRule[];
  /** When multiple rules exist: match all or any. */
  matchType?: "all" | "any";
  sortOrder: number;
  enabled: boolean;
};

export type ClientStorePage = {
  id: string;
  handle: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
  sections: ClientStoreSection[];
};

/** Shopify-style header menu link. */
export type StoreNavItemType =
  | "home"
  | "page"
  | "collection"
  | "products"
  | "url"
  | "group";

export type ClientStoreNavItem = {
  id: string;
  label: string;
  type: StoreNavItemType;
  /** page.id or collection.id when type is page/collection */
  targetId?: string;
  /** External or absolute path when type is url */
  href?: string;
  openInNewTab?: boolean;
  enabled?: boolean;
  /** Nested submenu links (one level deep). */
  children?: ClientStoreNavItem[];
};

export type ClientStoreNavigation = {
  /** store = use store.logoUrl / initials; custom = customLogoUrl; none = text only */
  logoMode?: "store" | "custom" | "none";
  customLogoUrl?: string;
  showStoreName?: boolean;
  /** Reserved for future storefront search */
  showSearch?: boolean;
  items: ClientStoreNavItem[];
};

export type ClientStoreTheme = {
  pages: ClientStorePage[];
  collections: ClientStoreCollection[];
  /** Synced from the Home page for public storefront compatibility. */
  sections: ClientStoreSection[];
  /** Customizable storefront header menu. */
  navigation?: ClientStoreNavigation;
};

export type StoreWidgetDefinition = {
  type: StoreSectionType;
  label: string;
  description: string;
  defaults: StoreSectionSettings;
};

export const STORE_WIDGET_LIBRARY: StoreWidgetDefinition[] = [
  {
    type: "hero",
    label: "Hero banner",
    description: "Headline, supporting text, and optional background image.",
    defaults: {
      title: "Shop the collection",
      subtitle: "Pick your sizes — we’ll take care of the rest.",
      eyebrow: "Collection",
      buttonLabel: "Shop now",
      buttonLinkType: "products",
      textAlign: "left",
      backgroundColor: "#f6f6f7",
      textColor: "#303030",
      overlayOpacity: 40,
    },
  },
  {
    type: "featured_collection",
    label: "Featured collection",
    description: "Showcase products from one collection.",
    defaults: {
      title: "Featured",
      productSource: "collection",
      columns: 4,
      backgroundColor: "#ffffff",
      textColor: "#303030",
      cardBackgroundMode: "auto",
      cardBackgroundColor: "#ffffff",
      cardShadow: "soft",
    },
  },
  {
    type: "product_grid",
    label: "Product grid",
    description: "All enabled products in a clean catalog grid.",
    defaults: {
      title: "Products",
      productSource: "all",
      columns: 4,
      backgroundColor: "#ffffff",
      textColor: "#303030",
      cardBackgroundMode: "auto",
      cardBackgroundColor: "#ffffff",
      cardShadow: "soft",
    },
  },
  {
    type: "rich_text",
    label: "Rich text",
    description: "Section heading and paragraph for messaging.",
    defaults: {
      title: "About this store",
      body: "Order branded gear for your team. Choose colors and sizes below.",
      textAlign: "center",
      backgroundColor: "#ffffff",
      textColor: "#303030",
    },
  },
  {
    type: "image_banner",
    label: "Image banner",
    description: "Wide image with optional heading overlay.",
    defaults: {
      title: "",
      subtitle: "",
      textAlign: "center",
      backgroundColor: "#f6f6f7",
      textColor: "#ffffff",
      overlayOpacity: 35,
    },
  },
  {
    type: "collection_list",
    label: "Collection list",
    description: "Cards linking shoppers into your collections.",
    defaults: {
      title: "Shop by collection",
      columns: 3,
      backgroundColor: "#ffffff",
      textColor: "#303030",
    },
  },
  {
    type: "product_detail",
    label: "Product details",
    description: "Gallery, price, size/color pickers, and add to cart.",
    defaults: {
      title: "",
      body: "Choose your color and size, then add it to your cart.",
      buttonLabel: "Add to cart",
      backgroundColor: "#ffffff",
      textColor: "#303030",
      textAlign: "left",
      cardBackgroundMode: "auto",
      cardBackgroundColor: "#ffffff",
      cardShadow: "soft",
    },
  },
];

/** Pages that cannot be deleted; product is a template, not a nav page. */
export const SYSTEM_PAGE_HANDLES = new Set(["home", "product"]);

export function isSystemPageHandle(handle: string): boolean {
  return SYSTEM_PAGE_HANDLES.has(handle);
}

/** Pages shown in the public storefront header (legacy fallback). */
export function isStorefrontNavPage(page: ClientStorePage): boolean {
  return page.enabled && page.handle !== "product";
}

export function newStoreNavItemId(): string {
  return `snav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Seed header links from enabled pages when no custom navigation exists yet. */
export function defaultNavigationFromPages(
  pages: ClientStorePage[]
): ClientStoreNavigation {
  const items: ClientStoreNavItem[] = pages
    .filter(isStorefrontNavPage)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((page) =>
      page.handle === "home"
        ? {
            id: `snav-${page.id}`,
            label: page.title || "Home",
            type: "home" as const,
            enabled: true,
          }
        : {
            id: `snav-${page.id}`,
            label: page.title,
            type: "page" as const,
            targetId: page.id,
            enabled: true,
          }
    );

  if (items.length === 0) {
    items.push({
      id: "snav-home",
      label: "Home",
      type: "home",
      enabled: true,
    });
  }

  return {
    logoMode: "store",
    showStoreName: true,
    showSearch: false,
    items,
  };
}

const STORE_NAV_ITEM_TYPES = [
  "home",
  "page",
  "collection",
  "products",
  "url",
  "group",
] as const;

function normalizeNavItemFields(
  item: Partial<ClientStoreNavItem> | null | undefined,
  index: number,
  allowChildren: boolean
): ClientStoreNavItem | null {
  if (!item || typeof item !== "object" || !item.label) return null;
  const type = STORE_NAV_ITEM_TYPES.includes(item.type as StoreNavItemType)
    ? (item.type as StoreNavItemType)
    : ("page" as const);

  const children =
    allowChildren && Array.isArray(item.children)
      ? item.children
          .map((child, childIndex) =>
            normalizeNavItemFields(child, childIndex, false)
          )
          .filter((child): child is ClientStoreNavItem => Boolean(child))
          .slice(0, 16)
      : undefined;

  return {
    id: item.id || `snav-${index}-${Date.now()}`,
    label: String(item.label).trim().slice(0, 60) || "Link",
    type,
    targetId: item.targetId,
    href: item.href,
    openInNewTab: item.openInNewTab === true,
    enabled: item.enabled !== false,
    ...(children && children.length ? { children } : {}),
  };
}

export function ensureStoreNavigation(
  navigation: ClientStoreNavigation | null | undefined,
  pages: ClientStorePage[]
): ClientStoreNavigation {
  if (!navigation || !Array.isArray(navigation.items) || navigation.items.length === 0) {
    return defaultNavigationFromPages(pages);
  }

  const items = navigation.items
    .map((item, index) => normalizeNavItemFields(item, index, true))
    .filter((item): item is ClientStoreNavItem => Boolean(item));

  return {
    logoMode:
      navigation.logoMode === "custom" || navigation.logoMode === "none"
        ? navigation.logoMode
        : "store",
    customLogoUrl: navigation.customLogoUrl,
    showStoreName: navigation.showStoreName !== false,
    showSearch: navigation.showSearch === true,
    items: items.length ? items : defaultNavigationFromPages(pages).items,
  };
}

export function getEnabledNavItems(
  navigation: ClientStoreNavigation | null | undefined
): ClientStoreNavItem[] {
  return (navigation?.items || []).filter((item) => item.enabled !== false);
}

export function getEnabledNavChildren(
  item: ClientStoreNavItem | null | undefined
): ClientStoreNavItem[] {
  return (item?.children || []).filter((child) => child.enabled !== false);
}

export function navItemHasSubmenu(item: ClientStoreNavItem): boolean {
  return getEnabledNavChildren(item).length > 0;
}

export type StoreNavAction =
  | { kind: "home" }
  | { kind: "page"; handle: string }
  | { kind: "collection"; collectionId: string }
  | { kind: "products" }
  | { kind: "url"; href: string; openInNewTab?: boolean }
  | { kind: "noop" };

/** Resolve a menu item into a storefront navigation action. */
export function resolveNavItemAction(
  item: ClientStoreNavItem,
  theme: ClientStoreTheme
): StoreNavAction {
  switch (item.type) {
    case "group":
      return { kind: "noop" };
    case "home":
      return { kind: "home" };
    case "products":
      return { kind: "products" };
    case "page": {
      const page = theme.pages.find(
        (row) => row.id === item.targetId && row.enabled !== false
      );
      if (!page || page.handle === "product") return { kind: "noop" };
      return { kind: "page", handle: page.handle };
    }
    case "collection": {
      const collection = theme.collections.find(
        (row) => row.id === item.targetId && row.enabled !== false
      );
      if (!collection) return { kind: "noop" };
      return { kind: "collection", collectionId: collection.id };
    }
    case "url": {
      const href = (item.href || "").trim();
      if (!href) return { kind: "noop" };
      return {
        kind: "url",
        href,
        openInNewTab: item.openInNewTab === true,
      };
    }
    default:
      return { kind: "noop" };
  }
}

/** Resolve a hero CTA into the same navigation actions used by the header menu. */
export function resolveHeroButtonAction(
  settings: StoreSectionSettings | null | undefined,
  theme: ClientStoreTheme
): StoreNavAction {
  const linkType = settings?.buttonLinkType || "products";
  if (linkType === "none") return { kind: "noop" };
  if (linkType === "products") return { kind: "products" };
  if (linkType === "url") {
    const href = (settings?.buttonUrl || "").trim();
    if (!href) return { kind: "noop" };
    return {
      kind: "url",
      href,
      openInNewTab: settings?.buttonOpenInNewTab === true,
    };
  }
  return resolveNavItemAction(
    {
      id: "hero-cta",
      label: settings?.buttonLabel || "Shop",
      type: linkType,
      targetId: settings?.buttonLinkTargetId,
    },
    theme
  );
}

export function isNavItemActive(
  item: ClientStoreNavItem,
  theme: ClientStoreTheme,
  activePageHandle: string,
  activeCollectionId: string | null
): boolean {
  if (
    getEnabledNavChildren(item).some((child) =>
      isNavItemActive(child, theme, activePageHandle, activeCollectionId)
    )
  ) {
    return true;
  }

  const action = resolveNavItemAction(item, theme);
  if (action.kind === "collection") {
    return activeCollectionId === action.collectionId;
  }
  if (activeCollectionId) return false;
  if (action.kind === "home" || action.kind === "products") {
    return activePageHandle === "home";
  }
  if (action.kind === "page") {
    return activePageHandle === action.handle;
  }
  return false;
}

export function newStoreSectionId(): string {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newStoreCollectionId(): string {
  return `scol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newStoreCollectionRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Clone a collection (manual or smart) with fresh ids — keeps product membership/rules. */
export function duplicateClientStoreCollection(
  collection: ClientStoreCollection,
  options?: { nameSuffix?: string }
): ClientStoreCollection {
  const suffix = options?.nameSuffix ?? " (copy)";
  const baseName = collection.name.trim() || "Collection";
  return {
    ...collection,
    id: newStoreCollectionId(),
    name: `${baseName}${suffix}`.slice(0, 120),
    productIds: [...(collection.productIds || [])],
    excludedProductIds: [...(collection.excludedProductIds || [])],
    rules: (collection.rules || []).map((rule) => ({
      ...rule,
      id: newStoreCollectionRuleId(),
    })),
  };
}

/**
 * Insert a duplicated collection immediately after its source and re-index sortOrder.
 */
export function insertDuplicatedClientStoreCollection(
  collections: ClientStoreCollection[],
  sourceId: string
): { collections: ClientStoreCollection[]; duplicate: ClientStoreCollection } | null {
  const index = collections.findIndex((row) => row.id === sourceId);
  if (index < 0) return null;
  const duplicate = duplicateClientStoreCollection(collections[index]);
  const next = [
    ...collections.slice(0, index + 1),
    duplicate,
    ...collections.slice(index + 1),
  ].map((row, sortOrder) => ({ ...row, sortOrder }));
  return { collections: next, duplicate };
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function productHasTag(
  product: { tags?: string[] },
  tag: string
): boolean {
  const needle = normalizeTag(tag);
  if (!needle) return false;
  return (product.tags || []).some(
    (entry) => normalizeTag(entry) === needle
  );
}

function hasSmartRules(collection: ClientStoreCollection): boolean {
  return (collection.rules || []).some((rule) =>
    String(rule.value || "").trim()
  );
}

/** Smart when explicitly marked, or when rules exist and it isn't forced to manual. */
export function isSmartCollection(
  collection: ClientStoreCollection
): boolean {
  if (collection.selectionType === "smart") return true;
  if (collection.selectionType === "manual") return false;
  return hasSmartRules(collection);
}

function productMatchesRules(
  product: { tags?: string[] },
  collection: ClientStoreCollection
): boolean {
  const rules = (collection.rules || []).filter((rule) =>
    String(rule.value || "").trim()
  );
  if (rules.length === 0) return false;

  const checks = rules.map((rule) => {
    // Tag is the only rule field today; treat missing field as tag for older data.
    if (!rule.field || rule.field === "tag") {
      return productHasTag(product, rule.value);
    }
    return false;
  });

  return (collection.matchType || "all") === "any"
    ? checks.some(Boolean)
    : checks.every(Boolean);
}

/** Resolve which products belong in a collection (manual picks or smart tags). */
export function resolveCollectionProducts<
  T extends { id: string; tags?: string[]; enabled?: boolean },
>(collection: ClientStoreCollection, products: T[]): T[] {
  const enabled = products.filter((product) => product.enabled !== false);
  const excluded = new Set(collection.excludedProductIds || []);
  const order = new Map(
    (collection.productIds || []).map((id, index) => [id, index])
  );

  if (isSmartCollection(collection)) {
    // Membership comes from rules; productIds is an optional display order
    // (new matches not yet ordered land after pinned ones).
    const matched = enabled.filter(
      (product) =>
        !excluded.has(product.id) && productMatchesRules(product, collection)
    );
    if (order.size === 0) return matched;
    const catalogIndex = new Map(enabled.map((product, index) => [product.id, index]));
    return matched.sort((a, b) => {
      const aRank = order.has(a.id) ? (order.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
      const bRank = order.has(b.id) ? (order.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return (catalogIndex.get(a.id) ?? 0) - (catalogIndex.get(b.id) ?? 0);
    });
  }

  return enabled
    .filter((product) => order.has(product.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function collectProductTags(
  products: Array<{ tags?: string[] }>
): string[] {
  const tags = new Set<string>();
  for (const product of products) {
    for (const tag of product.tags || []) {
      const cleaned = tag.trim();
      if (cleaned) tags.add(cleaned);
    }
  }
  return Array.from(tags).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function newStorePageId(): string {
  return `spage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugifyPageHandle(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "page"
  );
}

export function createSectionFromWidget(
  type: StoreSectionType,
  sortOrder = 0
): ClientStoreSection {
  const widget =
    STORE_WIDGET_LIBRARY.find((entry) => entry.type === type) ||
    STORE_WIDGET_LIBRARY[0];
  return {
    id: newStoreSectionId(),
    type: widget.type,
    enabled: true,
    sortOrder,
    settings: { ...widget.defaults },
  };
}

function createHomePage(store: {
  headline?: string;
  description?: string;
  heroImageUrl?: string;
  name?: string;
}): ClientStorePage {
  const hero = createSectionFromWidget("hero", 0);
  hero.settings = {
    ...hero.settings,
    title: store.headline || store.name || "Shop the collection",
    subtitle: store.description || hero.settings.subtitle,
    imageUrl: store.heroImageUrl || undefined,
  };
  const grid = createSectionFromWidget("product_grid", 1);
  return {
    id: "page-home",
    handle: "home",
    title: "Home",
    enabled: true,
    sortOrder: 0,
    sections: [hero, grid],
  };
}

function createAboutPage(): ClientStorePage {
  const rich = createSectionFromWidget("rich_text", 0);
  rich.settings = {
    ...rich.settings,
    title: "About",
    body: "Tell your client’s team who this store is for and how ordering works.",
  };
  return {
    id: "page-about",
    handle: "about",
    title: "About",
    enabled: true,
    sortOrder: 2,
    sections: [rich],
  };
}

function createProductPage(): ClientStorePage {
  const detail = createSectionFromWidget("product_detail", 0);
  const tips = createSectionFromWidget("rich_text", 1);
  tips.settings = {
    ...tips.settings,
    title: "How ordering works",
    body: "Pick your color and size, add to cart, then submit. Your print shop will confirm fulfillment.",
    textAlign: "left",
  };
  return {
    id: "page-product",
    handle: "product",
    title: "Product",
    enabled: true,
    sortOrder: 1,
    sections: [detail, tips],
  };
}

function ensureProductPageSections(page: ClientStorePage): ClientStorePage {
  if (page.handle !== "product") return page;
  if (page.sections.some((section) => section.type === "product_detail")) {
    return page;
  }
  const detail = createSectionFromWidget("product_detail", 0);
  return {
    ...page,
    sections: [
      detail,
      ...page.sections.map((section, index) => ({
        ...section,
        sortOrder: index + 1,
      })),
    ],
  };
}

function ensureSystemPages(
  pages: ClientStorePage[],
  legacy?: {
    headline?: string;
    description?: string;
    heroImageUrl?: string;
    name?: string;
  }
): ClientStorePage[] {
  let next = pages.slice();
  if (!next.some((page) => page.handle === "home")) {
    next = [createHomePage(legacy || {}), ...next];
  }
  if (!next.some((page) => page.handle === "product")) {
    const homeIndex = next.findIndex((page) => page.handle === "home");
    const insertAt = homeIndex >= 0 ? homeIndex + 1 : 0;
    next = [
      ...next.slice(0, insertAt),
      createProductPage(),
      ...next.slice(insertAt),
    ];
  }
  return next.map(ensureProductPageSections);
}

function sortPages(pages: ClientStorePage[]): ClientStorePage[] {
  return pages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((page, index) => ({
      ...page,
      sortOrder: index,
      sections: (page.sections || [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

function syncThemeSections(theme: {
  pages: ClientStorePage[];
  collections: ClientStoreCollection[];
  navigation?: ClientStoreNavigation | null;
}, legacy?: {
  headline?: string;
  description?: string;
  heroImageUrl?: string;
  name?: string;
}): ClientStoreTheme {
  const pages = sortPages(ensureSystemPages(theme.pages, legacy));
  const home =
    pages.find((page) => page.handle === "home") || pages[0] || null;
  return {
    pages,
    collections: (theme.collections || [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder),
    sections: home?.sections || [],
    navigation: ensureStoreNavigation(theme.navigation, pages),
  };
}

/** Seed a sensible default theme if the store has none yet. */
export function defaultThemeFromLegacy(store: {
  headline?: string;
  description?: string;
  heroImageUrl?: string;
  name?: string;
}): ClientStoreTheme {
  return syncThemeSections(
    {
      pages: [createHomePage(store), createProductPage(), createAboutPage()],
      collections: [],
    },
    store
  );
}

export function ensureStoreTheme(
  theme?: ClientStoreTheme | null,
  legacy?: {
    headline?: string;
    description?: string;
    heroImageUrl?: string;
    name?: string;
  }
): ClientStoreTheme {
  if (theme?.pages?.length) {
    return syncThemeSections(
      {
        pages: theme.pages,
        collections: theme.collections || [],
        navigation: theme.navigation,
      },
      legacy
    );
  }

  if (theme?.sections?.length) {
    const home: ClientStorePage = {
      id: "page-home",
      handle: "home",
      title: "Home",
      enabled: true,
      sortOrder: 0,
      sections: theme.sections
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
    return syncThemeSections(
      {
        pages: [home, createProductPage(), createAboutPage()],
        collections: theme.collections || [],
        navigation: theme.navigation,
      },
      legacy
    );
  }

  return defaultThemeFromLegacy(legacy || {});
}

export function getHomePage(theme: ClientStoreTheme): ClientStorePage | null {
  return (
    theme.pages.find((page) => page.handle === "home") || theme.pages[0] || null
  );
}

export function getPageById(
  theme: ClientStoreTheme,
  pageId?: string | null
): ClientStorePage | null {
  if (!pageId) return getHomePage(theme);
  return theme.pages.find((page) => page.id === pageId) || getHomePage(theme);
}

export function updateThemePage(
  theme: ClientStoreTheme,
  pageId: string,
  patch: Partial<ClientStorePage> | ((page: ClientStorePage) => ClientStorePage)
): ClientStoreTheme {
  const pages = theme.pages.map((page) => {
    if (page.id !== pageId) return page;
    return typeof patch === "function" ? patch(page) : { ...page, ...patch };
  });
  return syncThemeSections({
    pages,
    collections: theme.collections,
    navigation: theme.navigation,
  });
}

export function updatePageSections(
  theme: ClientStoreTheme,
  pageId: string,
  sections: ClientStoreSection[]
): ClientStoreTheme {
  return updateThemePage(theme, pageId, (page) => ({
    ...page,
    sections: sections.map((section, index) => ({
      ...section,
      sortOrder: index,
    })),
  }));
}

export function createStorePage(
  theme: ClientStoreTheme,
  input: { title: string; handle?: string } = { title: "New page" }
): { theme: ClientStoreTheme; page: ClientStorePage } {
  const baseHandle = slugifyPageHandle(input.handle || input.title);
  const used = new Set(theme.pages.map((page) => page.handle));
  let handle = baseHandle;
  let n = 2;
  while (used.has(handle) || isSystemPageHandle(handle)) {
    handle = `${baseHandle}-${n}`;
    n += 1;
  }
  const rich = createSectionFromWidget("rich_text", 0);
  rich.settings = {
    ...rich.settings,
    title: input.title,
    body: "Add content for this page.",
  };
  const page: ClientStorePage = {
    id: newStorePageId(),
    handle,
    title: input.title.trim() || "New page",
    enabled: true,
    sortOrder: theme.pages.length,
    sections: [rich],
  };
  return {
    theme: syncThemeSections({
      pages: [...theme.pages, page],
      collections: theme.collections,
      navigation: theme.navigation,
    }),
    page,
  };
}

/** Update the storefront header menu without touching pages/collections. */
export function updateThemeNavigation(
  theme: ClientStoreTheme,
  navigation: ClientStoreNavigation
): ClientStoreTheme {
  return syncThemeSections({
    pages: theme.pages,
    collections: theme.collections,
    navigation,
  });
}

export function sectionTypeLabel(type: StoreSectionType): string {
  return (
    STORE_WIDGET_LIBRARY.find((entry) => entry.type === type)?.label || type
  );
}
