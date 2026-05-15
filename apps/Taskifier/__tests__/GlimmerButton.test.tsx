import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { GlimmerButton } from "../components/GlimmerButton";

describe("GlimmerButton", () => {
    it("renders with default title", () => {
        const { getByText } = render(
            <GlimmerButton onPress={async () => { }} onSuccess={() => { }} />,
        );
        expect(getByText("Make Actionable")).toBeTruthy();
    });

    it("renders with custom title", () => {
        const { getByText } = render(
            <GlimmerButton
                onPress={async () => { }}
                onSuccess={() => { }}
                title="Rewrite Task"
            />,
        );
        expect(getByText("Rewrite Task")).toBeTruthy();
    });

    it("shows success indicator after resolved press", async () => {
        const onSuccess = jest.fn();
        const { getByText } = render(
            <GlimmerButton onPress={async () => { }} onSuccess={onSuccess} />,
        );

        const pressable = getByText("Make Actionable").parent?.parent;
        expect(pressable).toBeTruthy();

        await act(async () => {
            fireEvent.press(pressable!);
        });

        expect(getByText("✓ Done")).toBeTruthy();
    });

    it("renders disabled state without crashing", () => {
        const { getByText } = render(
            <GlimmerButton
                onPress={async () => { }}
                onSuccess={() => { }}
                disabled={true}
            />,
        );
        expect(getByText("Make Actionable")).toBeTruthy();
    });
});
