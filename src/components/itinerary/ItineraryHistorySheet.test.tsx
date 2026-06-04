// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ItineraryHistorySheet } from "./ItineraryHistorySheet";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mutateMock = vi.fn();

const histories = [
  {
    id: "history-1",
    destination_country: "JP",
    destination_city: "Osaka",
    start_date: "2026-06-02",
    end_date: "2026-06-20",
    duration_days: 19,
    budget_krw: 2_000_000,
    accommodation_location: "Just Sleep Osaka",
    places_data: [],
    days_data: {},
    created_at: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "history-2",
    destination_country: "US",
    destination_city: "New York",
    start_date: "2026-06-02",
    end_date: "2026-06-18",
    duration_days: 17,
    budget_krw: 1_500_000,
    accommodation_location: "West Side YMCA",
    places_data: [],
    days_data: {},
    created_at: "2026-06-02T00:00:00.000Z",
  },
];

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    isPending: false,
    mutate: mutateMock,
  }),
  useQuery: () => ({
    data: histories,
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/api/itinerary-history", () => ({
  deleteItineraryHistories: vi.fn(),
  fetchItineraryHistories: vi.fn(),
}));

vi.mock("@/lib/diplolife/state", () => ({
  useDiploLifeStore: (selector: (state: { userProfile: { id: string } }) => unknown) =>
    selector({ userProfile: { id: "user-1" } }),
}));

let container: HTMLDivElement;
let root: Root;

const renderSheet = () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root.render(
      <ItineraryHistorySheet
        open
        onOpenChange={() => undefined}
        onSelectHistory={() => undefined}
      />,
    );
  });
};

const clickButtonByText = (text: string) => {
  const button = [...document.querySelectorAll("button")].find((node) =>
    node.textContent?.includes(text),
  );

  if (!button) throw new Error(`Button not found: ${text}`);

  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickLastButtonByExactText = (text: string) => {
  const button = [...document.querySelectorAll("button")]
    .filter((node) => node.textContent?.trim() === text)
    .at(-1);

  if (!button) throw new Error(`Button not found: ${text}`);

  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("ItineraryHistorySheet", () => {
  beforeEach(() => {
    mutateMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    document.body.innerHTML = "";
  });

  it("opens a confirmation dialog before deleting all visible histories", () => {
    renderSheet();

    expect(document.body.textContent).toContain("Delete all");

    clickButtonByText("Delete all");

    expect(document.body.textContent).toContain("Delete all itinerary histories?");
    expect(document.body.textContent).toContain("2 itinerary histories");

    const confirmButtons = [...document.querySelectorAll("button")].filter((node) =>
      node.textContent?.includes("Delete all"),
    );
    const confirmButton = confirmButtons.at(-1);
    if (!confirmButton) throw new Error("Confirm button not found");

    act(() => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mutateMock).toHaveBeenCalledWith(["history-1", "history-2"]);
  });

  it("opens a confirmation dialog before deleting one history", () => {
    renderSheet();

    const deleteButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete itinerary history"]',
    );
    if (!deleteButton) throw new Error("Delete button not found");

    act(() => {
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Delete itinerary history?");
    expect(document.body.textContent).toContain('"Osaka trip" will be permanently deleted.');

    clickLastButtonByExactText("Delete");

    expect(mutateMock).toHaveBeenCalledWith(["history-1"]);
  });
});
