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
    const pemPath = join(process.cwd(), "..", "..", "downloads", "EAS-upload-certificate-NEW-D9EF.pem");
    const pem = readFileSync(pemPath, "utf-8");
    res.setHeader("Content-Type", "application/x-pem-file");
    res.setHeader("Content-Disposition", 'attachment; filename="upload_certificate_NEW.pem"');
    res.send(pem);
  } catch {
    res.status(404).json({ error: "Dosya bulunamadı" });
  }
});

router.get("/upload-keystore", (_req, res) => {
  try {
    const jksPath = join(process.cwd(), "..", "..", "downloads", "paranormal-hunter-upload.jks");
    const jks = readFileSync(jksPath);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="paranormal-hunter-upload.jks"');
    res.send(jks);
  } catch {
    res.status(404).json({ error: "Dosya bulunamadı" });
  }
});

export default router;
