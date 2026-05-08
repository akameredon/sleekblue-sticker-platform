import { Router, type IRouter } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const GenerateStickerBody = z.object({
  description: z.string().min(3).max(500),
  style: z.enum(["die-cut", "holographic", "minimal", "retro", "bold"]).optional().default("die-cut"),
});

router.post("/generate/sticker", async (req, res) => {
  const body = GenerateStickerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: body.error.flatten() });
    return;
  }

  const { description, style } = body.data;

  const styleGuide: Record<string, string> = {
    "die-cut": "clean white background, sharp die-cut sticker shape, thick white border, bold colors",
    holographic: "holographic rainbow foil effect, prismatic shimmer, vibrant iridescent colors",
    minimal: "minimal flat design, clean lines, limited 2-color palette, white background",
    retro: "retro 80s aesthetic, bold outlines, sunburst patterns, vintage color palette",
    bold: "bold graphic design, thick outlines, high contrast, pop art style",
  };

  const prompt = `Sticker design artwork: ${description}. Style: ${styleGuide[style]}. Product photo quality. Square format. No text unless requested.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      res.status(500).json({ error: "No image returned" });
      return;
    }

    res.json({
      imageUrl,
      prompt,
      description,
      style,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
