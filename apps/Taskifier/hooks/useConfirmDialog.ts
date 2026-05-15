import { useState, useCallback } from "react";
import type { ConfirmConfig } from "@/types";

export function useConfirmDialog() {
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

    const showConfirm = useCallback((config: ConfirmConfig) => {
        setConfirmConfig(config);
        setConfirmVisible(true);
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmVisible(false);
    }, []);

    return { confirmVisible, confirmConfig, showConfirm, hideConfirm };
}
