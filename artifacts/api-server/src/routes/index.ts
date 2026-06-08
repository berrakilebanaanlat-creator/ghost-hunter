import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import healthRouter from "./health";
import ttsRouter from "./tts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ttsRouter);

router.get("/upload-cert", (_req, res) => {
  try {
    const pemPath = join(process.cwd(), "..", "ghost-hunter", "keystore", "upload_certificate.pem");
    const pem = readFileSync(pemPath, "utf-8");
    res.setHeader("Content-Type", "application/x-pem-file");
    res.setHeader("Content-Disposition", 'attachment; filename="upload_certificate.pem"');
    res.send(pem);
  } catch {
    res.status(404).json({ error: "Dosya bulunamadı" });
  }
});

export default router;
