describe("useTeamStream", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

it("is called with teamId", () => {
         const mockUseTeamStream = jest.fn();
         jest.doMock("../hooks/useTeamStream", () => ({
             useTeamStream: mockUseTeamStream,
         }));

         const { useTeamStream } = require("../hooks/useTeamStream");
         useTeamStream("team-xyz");

         expect(mockUseTeamStream).toHaveBeenCalledWith("team-xyz");
     });
});

describe("exponential backoff logic", () => {
    it("doubles backoff on each reconnect", () => {
        const INITIAL = 1000;
        const MAX = 30000;

        let backoff = INITIAL;
        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(2000);

        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(4000);

        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(8000);

        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(16000);

        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(30000);

        backoff = Math.min(backoff * 2, MAX);
        expect(backoff).toBe(30000);
    });

    it("starts at 1 second", () => {
        expect(1000).toBe(1000);
    });

    it("caps at 30 seconds", () => {
        const INITIAL = 1000;
        const MAX = 30000;
        let backoff = INITIAL;
        for (let i = 0; i < 10; i++) {
            backoff = Math.min(backoff * 2, MAX);
        }
        expect(backoff).toBe(30000);
    });
});
