import { create } from "zustand";
import { createTaskSlice } from "./taskSlice";
import { createTeamSlice } from "./teamSlice";
import { createMemberSlice } from "./memberSlice";
import { createUISlice } from "./uiSlice";
import { createSSESlice } from "./sseSlice";
import type { StoreState } from "./types";

export type { StoreState } from "./types";

export const useTasksStore = create<StoreState>()((set, get, store) => ({
    ...createTaskSlice(set, get, store),
    ...createTeamSlice(set, get, store),
    ...createMemberSlice(set, get, store),
    ...createUISlice(set, get, store),
    ...createSSESlice(set, get, store),
}));
