import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";

/**
 * Browsers (Chrome in particular) can only record voice notes as
 * WebM/Opus via MediaRecorder — WhatsApp Cloud API only accepts OGG/Opus
 * for audio messages. This shells out to ffmpeg (installed via apk in
 * backend/Dockerfile) to re-encode, piping bytes through stdin/stdout so
 * nothing touches disk. Verified against a real ffmpeg 6.1.1/libopus
 * build: WebM/Opus in, valid mono 48kHz OGG/Opus out.
 */
@Injectable()
export class AudioTranscodeService {
  private readonly logger = new Logger(AudioTranscodeService.name);

  webmToOggOpus(input: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-c:a",
        "libopus",
        "-ac",
        "1",
        "-f",
        "ogg",
        "pipe:1",
      ]);

      const chunks: Buffer[] = [];
      let stderr = "";
      ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      ffmpeg.on("error", (error) => {
        this.logger.error(`ffmpeg failed to start: ${error.message}`);
        reject(error);
      });
      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          this.logger.warn(`ffmpeg exited ${code}: ${stderr.slice(-500)}`);
          reject(new Error(`Audio transcode failed (ffmpeg exit ${code})`));
        }
      });

      ffmpeg.stdin.on("error", () => {
        // Ignore EPIPE — happens if ffmpeg exits/rejects the input before
        // stdin.end() finishes writing; the 'close' handler above already
        // reports the real failure reason.
      });
      ffmpeg.stdin.write(input);
      ffmpeg.stdin.end();
    });
  }
}
