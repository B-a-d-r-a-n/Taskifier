import { aiEnv } from "../ai";

const VALID_AI_ENV = {
    OLLAMA_BASE_URL: "http://192.168.1.180:11434",
    OLLAMA_MODEL: "llama3.2",
};

describe("aiEnv", () => {
    it("parses a valid environment object", () => {
        const result = aiEnv.safeParse(VALID_AI_ENV);
        expect(result.success).toBe(true);
    });

    it("applies defaults when optional fields are missing", () => {
        const result = aiEnv.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.OLLAMA_BASE_URL).toBe("http://192.168.1.180:11434");
            expect(result.data.OLLAMA_MODEL).toBe("llama3.2");
        }
    });

    it("throws on invalid OLLAMA_BASE_URL (not a url)", () => {
        const result = aiEnv.safeParse({
            OLLAMA_BASE_URL: "not-a-url",
            OLLAMA_MODEL: "llama3.2",
        });
        expect(result.success).toBe(false);
    });

    it("accepts custom model", () => {
        const result = aiEnv.safeParse({
            OLLAMA_BASE_URL: "http://192.168.1.180:11434",
            OLLAMA_MODEL: "llama3.2",
        });
        expect(result.success).toBe(true);
    });
});
