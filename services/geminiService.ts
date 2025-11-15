
import { GoogleGenAI, Modality } from "@google/genai";

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("未设置 API_KEY 环境变量");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("在 Gemini API 的响应中未找到图像数据。");
  } catch (error) {
    console.error("调用 Gemini API 时出错:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API 错误： ${error.message}`);
    }
    throw new Error("与 Gemini API 通信时发生意外错误。");
  }
};