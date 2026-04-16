import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { PWAInstallBanner } from "../../components/PWAInstallBanner";

describe("PWAInstallBanner", () => {
  it("appears after beforeinstallprompt and calls prompt on install", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });

    render(<PWAInstallBanner />);
    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = await screen.findByRole("button", { name: /^install$/i });
    fireEvent.click(installButton);

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });
});
