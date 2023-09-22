import { Upload, Video } from "lucide-react";
import { Separator } from "./ui/separator";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export function VideoInputForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  async function convertVideoToAudio(video: File) {
    console.log("Convert started");

    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile("input.mp4", await fetchFile(video));
    ffmpeg.on("progress", ({ progress }) => {
      console.log("Convert progress:" + Math.round(progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const data = await ffmpeg.readFile("output.mp3");
    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert finishing");
    return audioFile;
  }

  async function handleUploadVideo(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault();

    // const prompt = promptInputRef.current?.value;

    if (!videoFile) return;

    const audioFile = await convertVideoToAudio(videoFile);
    console.log(audioFile);
  }

  function handleFileSelected(evt: ChangeEvent<HTMLInputElement>) {
    const { files } = evt.currentTarget;

    if (!files) return;

    const selectedFile = files[0];

    setVideoFile(selectedFile);
  }

  const previewURL = useMemo(() => {
    if (!videoFile) return null;

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form className="space-y-4" onSubmit={handleUploadVideo}>
      <label
        className="relative border rounded-md aspect-video cursor-pointer border-dashed text-sm flex flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
        htmlFor="video"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <Video className="w-4 h-4" />
            Selecione um video
          </>
        )}
      </label>
      <input
        className="sr-only"
        type="file"
        name="video"
        id="video"
        accept="video/mp4"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_promp">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no video separadas por virgula (,)"
        />
      </div>

      <Button type="submit" className="w-full">
        Carregar video
        <Upload className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}
