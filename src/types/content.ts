/**
 * Content and data contracts used by the application.
 *
 * Notes:
 * - Pages CMS rich-text fields are stored as Markdown strings.
 * - Optional CMS fields stay optional even when they are currently absent
 *   from the JSON files.
 * - Structural containers that the application expects to exist stay required.
 */

export type RichText = string;
export type ImagePath = string;
export type Url = string;
export type IsoDate = string;

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

export interface GalleryItem {
  src?: ImagePath;
  alt?: string;
}

export interface Cta {
  label?: string;
  href?: Url;
}

export interface RequiredCta {
  label: string;
  href: Url;
}

export interface NavigationItem {
  href: string;
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Astro content collections                                                  */
/* -------------------------------------------------------------------------- */

export type FlashStatus = 'disponible' | 'vendido';

export interface FlashData {
  title: RichText;
  description?: RichText;
  cover: ImagePath;
  coverAlt: string;
  draft?: boolean;
  code: string;
  status?: FlashStatus;
  note?: RichText;
  showInCarousel?: boolean;
  categories?: string[];
  body?: RichText;
}

export interface TattooData {
  title: RichText;
  description?: RichText;
  cover: ImagePath;
  coverAlt: string;
  showInCarousel?: boolean;
  draft?: boolean;
  body?: RichText;
}

export type ArtworkStatus = 'disponible' | 'reservada' | 'vendida';

export interface ArtworkData {
  title: RichText;
  description?: RichText;
  technique?: string;
  dimensions?: string;
  widthCm?: number;
  heightCm?: number;
  status?: ArtworkStatus;
  priceEur?: number;
  showPrice?: boolean;
  collection?: string;
  cover: ImagePath;
  coverAlt: string;
  gallery?: GalleryItem[];
  draft?: boolean;
  body?: RichText;
}

export interface ProjectData {
  title?: RichText;
  description?: RichText;
  client?: string;
  services?: string;
  year?: string;
  contribution?: RichText;
  cover?: ImagePath;
  coverAlt?: string;
  gallery?: GalleryItem[];
  draft?: boolean;
  body?: RichText;
}

export interface AboutPageData {
  title?: RichText;
  eyebrow?: RichText;
  subtitle?: RichText;
  location?: string;
  portrait?: ImagePath;
  portraitAlt?: string;
  draft?: boolean;
  body?: RichText;
}

/* -------------------------------------------------------------------------- */
/* site.json                                                                  */
/* -------------------------------------------------------------------------- */

export interface HomeGuestsCta extends RequiredCta {
  visible?: boolean;
}

export interface HomeDiscipline {
  title?: RichText;
  text?: RichText;
  href?: Url;
  linkLabel?: string;
  image?: ImagePath;
  imageAlt?: string;
}

export interface HomeData {
  title: RichText;
  intro: RichText;
  heroImage: ImagePath;
  heroImageAlt: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  guestsCta?: HomeGuestsCta;
  workHeading?: RichText;
  disciplines?: HomeDiscipline[];
}

export interface SeoUi {
  title?: string;
  description?: string;
}

export interface HeaderLogoUi {
  alt?: string;
  mobile?: ImagePath;
  tablet?: ImagePath;
  desktop?: ImagePath;
}

export interface HeaderUi {
  tattooCta?: string;
  openMenu?: string;
  closeMenu?: string;
  navigationLabel?: string;
  logo: HeaderLogoUi;
}

export interface FooterUi {
  formsHeading?: string;
  disciplines?: string;
  contact?: string;
  email?: string;
  instagram?: string;
  sampleNotice?: string;
}

export interface FormsUi {
  unavailable?: string;
  tattoo?: string;
  artwork?: string;
  illustration?: string;
  general?: string;
  cityAlerts?: string;
}

export interface ContactStudioUi {
  address?: string;
  addressLinkText?: string;
  addressLinkUrl?: Url;
  mapText?: string;
  mapUrl?: Url;
}

export interface ContactUi {
  title?: string;
  description?: string;
  eyebrow?: RichText;
  heading?: RichText;
  intro?: RichText;
  studio?: ContactStudioUi;
}

export interface TattooUi {
  title?: string;
  description?: string;
  heading?: RichText;
  intro?: RichText;
  heroImage?: ImagePath;
  heroImageAlt?: string;
  tattoos?: string;
  flash?: string;
  viewAll?: string;
  noTattoos?: string;
  flashSampleNotice?: string;
  noFlash?: string;
}

export interface TattoosUi {
  title?: string;
  description?: string;
  eyebrow?: string;
  heading?: RichText;
}

export interface FlashUi {
  title?: string;
  description?: string;
  eyebrow?: string;
  heading?: RichText;
  filtersLabel?: string;
  all?: string;
  empty?: string;
  pageSizeBefore?: string;
  pageSizeAfter?: string;
  paginationLabel?: string;
  previous?: string;
  next?: string;
  pageStatus?: string;
  requestCta?: string;
}

export interface ArtworkUi {
  title?: string;
  description?: string;
  eyebrow?: RichText;
  heading?: RichText;
  intro?: RichText;
  heroImage?: ImagePath;
  heroImageAlt?: string;
  filtersLabel?: string;
  all?: string;
  available?: string;
  detailEyebrow?: string;
  shipping?: string;
  interestCta?: string;
  cardCta?: string;
}

export interface IllustrationUi {
  title?: string;
  description?: string;
  heading?: RichText;
  intro?: RichText;
  heroImage?: ImagePath;
  heroImageAlt?: string;
  projectEyebrow?: string;
  projectCardEyebrow?: string;
  projectCta?: string;
  contributionEyebrow?: string;

  /**
   * Present in the current site.json even though they were missing from the
   * previous Pages CMS configuration.
   */
  contactHeading?: RichText;
  contactCta?: string;
}

export interface CardFrameSizing {
  width?: string;
  height?: string;
}

export interface MaxWidthSizing {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}

export interface ImageSizingUi {
  default?: string;
  zoomable?: string;
  card?: string;
  cardFrame: CardFrameSizing;
  maxWidth: MaxWidthSizing;
}

export interface CarouselUi {
  previous?: string;
  next?: string;
  controlsPrefix?: string;
}

export interface SiteUi {
  skipLink?: string;
  homePage: SeoUi;
  about: SeoUi;
  header: HeaderUi;
  footer: FooterUi;
  forms: FormsUi;
  contact: ContactUi;
  tattoo: TattooUi;
  tattoos: TattoosUi;
  flash: FlashUi;
  artwork: ArtworkUi;
  illustration: IllustrationUi;
  imageSizing: ImageSizingUi;
  carousel: CarouselUi;
}

export interface SiteData {
  name?: string;
  artisticName?: string;
  home: HomeData;
  email?: string;
  instagram?: Url;
  instagramLabel?: string;
  navigation?: NavigationItem[];
  ui: SiteUi;
}

/* -------------------------------------------------------------------------- */
/* social.json                                                                */
/* -------------------------------------------------------------------------- */

export interface SocialPageOverride {
  path: string;
  title?: string;
  description?: string;
  image?: ImagePath;
  imageAlt?: string;
}

export interface SocialData {
  favicon: ImagePath;
  title: string;
  description: string;
  image: ImagePath;
  imageAlt: string;
  pages?: SocialPageOverride[];
}

/* -------------------------------------------------------------------------- */
/* guests.json                                                                */
/* -------------------------------------------------------------------------- */

export interface GuestEntry {
  id: string;
  city: string;
  studio?: string;
  address?: string;
  mapsUrl?: Url;
  description?: RichText;
  startDate: IsoDate;
  endDate: IsoDate;
  color: string;
  visible?: boolean;
}

export interface GuestsData {
  heading: RichText;
  eyebrow?: RichText;
  inquiryLabel: string;
  mapsLabel: string;
  alertsLabel: string;
  emptyMessage: RichText;
  footerHeading: RichText;
  showInFooter?: boolean;
  entries?: GuestEntry[];
}

/* -------------------------------------------------------------------------- */
/* ciudades.json                                                              */
/* -------------------------------------------------------------------------- */

export interface CitiesData {
  cities?: string[];
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* src/data/flash-categories/*.json                                           */
/* -------------------------------------------------------------------------- */

export interface FlashCategory {
  id: string;
  label: string;
  order: number;
  featured?: boolean;
  image?: ImagePath;
  imageAlt?: string;
  imageFrom?: string;
}

export interface FlashCategoriesData {
  categories?: FlashCategory[];
}

/* -------------------------------------------------------------------------- */
/* src/data/obra-collections/*.json                                           */
/* -------------------------------------------------------------------------- */

export interface ArtworkCollection {
  id: string;
  title: RichText;
  description?: RichText;
  featured?: boolean;
  image?: ImagePath;
  imageAlt?: string;
  imageFrom?: string;
}

export interface ArtworkCollectionsData {
  collections?: ArtworkCollection[];
}
