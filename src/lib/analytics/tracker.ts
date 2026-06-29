// Findora Enterprise Sourcing Platform Analytics Tracker (A/B & Funnel Ready)
// Complies with Brand Voice v2.1 and Customer Trust Framework

type TrackEventName =
  | "hero_viewed"
  | "trust_section_viewed"
  | "how_it_works_viewed"
  | "why_not_search_yourself_viewed"
  | "smart_report_viewed"
  | "faq_viewed"
  | "pricing_viewed"
  | "cta_click"
  | "faq_open"
  | "faq_fully_read"
  | "report_interaction"
  | "why_not_cheapest_opened"
  | "confidence_tooltip_opened"
  | "language_change"
  | "theme_toggle"
  | "error_event"
  | "exit_intent";

interface TrackPayload {
  sectionId?: string;
  ctaId?: string;
  label?: string;
  faqIndex?: number;
  question?: string;
  actionType?: string;
  value?: string | number;
  from?: string;
  to?: string;
  theme?: string;
  componentName?: string;
  errorMessage?: string;
  [key: string]: any;
}

class Tracker {
  private isDevelopment = process.env.NODE_ENV === "development";

  private logEvent(eventName: TrackEventName, payload: TrackPayload = {}) {
    const timestamp = new Date().toISOString();
    const data = { eventName, timestamp, ...payload };

    if (this.isDevelopment) {
      console.log(`[Analytics Tracker] Event triggered:`, data);
    }

    // Connect to browser APIs if window is defined
    if (typeof window !== "undefined") {
      try {
        // Future Google Analytics/Vercel Analytics/Mixpanel binding stubs:
        if ((window as any).va) {
          (window as any).va("event", { name: eventName, data });
        }
        if ((window as any).gtag) {
          (window as any).gtag("event", eventName, data);
        }
        // Custom window dispatch for testing e2e assertions
        window.dispatchEvent(
          new CustomEvent("findora_track_event", { detail: data })
        );
      } catch (err) {
        if (this.isDevelopment) {
          console.error("Failed to forward analytics event:", err);
        }
      }
    }
  }

  public pageView(locale: string) {
    this.logEvent("hero_viewed", { locale });
  }

  public sectionView(sectionId: string) {
    const eventNameMap: Record<string, TrackEventName> = {
      hero: "hero_viewed",
      trust: "trust_section_viewed",
      timeline: "how_it_works_viewed",
      comparison: "why_not_search_yourself_viewed",
      report: "smart_report_viewed",
      faq: "faq_viewed",
      pricing: "pricing_viewed",
    };

    const name = eventNameMap[sectionId] || "hero_viewed";
    this.logEvent(name, { sectionId });
  }

  public ctaClick(id: string, label: string) {
    this.logEvent("cta_click", { ctaId: id, label });
  }

  public faqOpen(faqIndex: number, question: string) {
    this.logEvent("faq_open", { faqIndex, question });
  }

  public faqFullyRead(faqIndex: number, question: string) {
    this.logEvent("faq_fully_read", { faqIndex, question });
  }

  public whyNotCheapestOpened() {
    this.logEvent("why_not_cheapest_opened");
  }

  public confidenceTooltipOpened() {
    this.logEvent("confidence_tooltip_opened");
  }

  public reportInteraction(actionType: string, value: string | number) {
    this.logEvent("report_interaction", { actionType, value });
  }

  public languageChange(from: string, to: string) {
    this.logEvent("language_change", { from, to });
  }

  public themeToggle(theme: string) {
    this.logEvent("theme_toggle", { theme });
  }

  public errorEvent(componentName: string, errorMessage: string) {
    this.logEvent("error_event", { componentName, errorMessage });
  }

  public exitIntent() {
    this.logEvent("exit_intent");
  }
}

export const analytics = new Tracker();
export default analytics;
