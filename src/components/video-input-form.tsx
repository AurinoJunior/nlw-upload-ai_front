import { Upload, Video } from "lucide-react";
import { Separator } from "./ui/separator";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type status = "waiting" | "converting" | "uploading" | "generating" | "success";

const statusMessages = {
  converting: "Convertendo...",
  generating: "Transcrevendo...",
  uploading: "Carregando...",
  success: "Sucesso!",
};

interface IVideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm({ onVideoUploaded }: IVideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<status>("waiting");
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

    const prompt = promptInputRef.current?.value;

    if (!videoFile) return;

    setStatus("converting");

    const audioFile = await convertVideoToAudio(videoFile);
    const data = new FormData();

    data.append("filename", audioFile);

    setStatus("uploading");

    const response = await api.post("/videos", data);
    const videoId = response.data.video.id;

    setStatus("generating");

    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    });

    setStatus("success");

    onVideoUploaded(videoId);
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

      <Button
        data-success={status === "success"}
        type="submit"
        className="w-full data-[success=true]:bg-emerald-400"
        disabled={status !== "waiting"}
      >
        {status === "waiting" ? (
          <>
            Carregar video
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessages[status]
        )}
      </Button>
    </form>
  );
}
