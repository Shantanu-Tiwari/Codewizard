"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import GeneratePodcast from "@/components/GeneratePodcast"
import GenerateThumbnail from "@/components/GenerateThumbnail"
import { Loader, Upload } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/components/ui/use-toast"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"

const voiceCategories = ['alloy', 'shimmer', 'nova', 'echo', 'fable', 'onyx'];

const formSchema = z.object({
  podcastTitle: z.string().min(2),
  podcastDescription: z.string().min(2),
})

const CreatePodcast = () => {
  const router = useRouter()
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const [audioUrl, setAudioUrl] = useState('');
  const [audioStorageId, setAudioStorageId] = useState<Id<"_storage"> | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const [voiceType, setVoiceType] = useState<string | null>(null);
  const [voicePrompt, setVoicePrompt] = useState('');
  const [isUsingMP3, setIsUsingMP3] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPodcast = useMutation(api.podcasts.createPodcast)
  const generateUploadUrl = useMutation(api.podcasts.generateUploadUrl)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      podcastTitle: "",
      podcastDescription: "",
    },
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio/')) {
      toast({
        title: 'Please upload an audio file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingFile(true);

      // Get upload URL from Convex
      const { uploadUrl, storageId } = await generateUploadUrl({ fileType: file.type });

      // Upload file to storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      // Use the storage ID to construct the URL or get it from your backend
      const fileUrl = result.url;

      // Create an audio element to get duration
      const audio = new Audio(URL.createObjectURL(file));
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(Math.round(audio.duration));
      });

      setAudioUrl(fileUrl);
      setAudioStorageId(storageId);
      setIsUsingMP3(true);
      setVoiceType(null); // Reset AI voice selection when using MP3

      toast({
        title: 'Audio file uploaded successfully',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error uploading audio file',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const triggerFileUpload = () => {
    audioInputRef.current?.click();
  };

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      if (!audioUrl || !imageUrl || !audioStorageId) {
        toast({
          title: 'Please provide audio and image',
        })
        setIsSubmitting(false);
        throw new Error('Please provide audio and image')
      }

      if (!isUsingMP3 && !voiceType) {
        toast({
          title: 'Please select an AI voice or upload an MP3',
        })
        setIsSubmitting(false);
        throw new Error('Please select an AI voice or upload an MP3')
      }

      const podcast = await createPodcast({
        podcastTitle: data.podcastTitle,
        podcastDescription: data.podcastDescription,
        audioUrl,
        imageUrl,
        voiceType: voiceType || 'custom_mp3',
        imagePrompt,
        voicePrompt: isUsingMP3 ? 'Custom MP3 Upload' : voicePrompt,
        views: 0,
        audioDuration,
        audioStorageId,
        imageStorageId: imageStorageId!,
      })

      toast({ title: 'Podcast created' })
      setIsSubmitting(false);
      router.push('/')
    } catch (error) {
      console.log(error);
      toast({
        title: 'Error creating podcast',
        variant: 'destructive',
      })
      setIsSubmitting(false);
    }
  }

  return (
      <section className="mt-10 flex flex-col">
        <h1 className="text-20 font-bold text-white-1">Create Podcast</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-12 flex w-full flex-col">
            <div className="flex flex-col gap-[30px] border-b border-black-5 pb-10">
              <FormField
                  control={form.control}
                  name="podcastTitle"
                  render={({ field }) => (
                      <FormItem className="flex flex-col gap-2.5">
                        <FormLabel className="text-16 font-bold text-white-1">Title</FormLabel>
                        <FormControl>
                          <Input className="input-class focus-visible:ring-offset-orange-1" placeholder="JSM Pro Podcast" {...field} />
                        </FormControl>
                        <FormMessage className="text-white-1" />
                      </FormItem>
                  )}
              />

              <div className="flex flex-col gap-2.5">
                <Label className="text-16 font-bold text-white-1">
                  Select Audio Source
                </Label>

                {!isUsingMP3 && (
                    <Select onValueChange={(value) => setVoiceType(value)}>
                      <SelectTrigger className={cn('text-16 w-full border-none bg-black-1 text-gray-1 focus-visible:ring-offset-orange-1')}>
                        <SelectValue placeholder="Select AI Voice" className="placeholder:text-gray-1" />
                      </SelectTrigger>
                      <SelectContent className="text-16 border-none bg-black-1 font-bold text-white-1 focus:ring-orange-1">
                        {voiceCategories.map((category) => (
                            <SelectItem key={category} value={category} className="capitalize focus:bg-orange-1">
                              {category}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                )}

                <div className="flex items-center gap-4">
                  <input
                      type="file"
                      ref={audioInputRef}
                      onChange={handleFileUpload}
                      accept="audio/mp3,audio/wav"
                      className="hidden"
                  />
                  <Button
                      type="button"
                      onClick={triggerFileUpload}
                      className="flex items-center gap-2 bg-orange-1"
                      disabled={isUploadingFile}
                  >
                    {isUploadingFile ? (
                        <>
                          <Loader size={20} className="animate-spin" />
                          Uploading...
                        </>
                    ) : (
                        <>
                          <Upload size={20} />
                          Upload MP3
                        </>
                    )}
                  </Button>
                  {isUsingMP3 && (
                      <Button
                          type="button"
                          onClick={() => {
                            setIsUsingMP3(false);
                            setAudioUrl('');
                            setAudioStorageId(null);
                          }}
                          variant="destructive"
                      >
                        Remove MP3
                      </Button>
                  )}
                </div>
              </div>

              <FormField
                  control={form.control}
                  name="podcastDescription"
                  render={({ field }) => (
                      <FormItem className="flex flex-col gap-2.5">
                        <FormLabel className="text-16 font-bold text-white-1">Description</FormLabel>
                        <FormControl>
                          <Textarea className="input-class focus-visible:ring-offset-orange-1" placeholder="Write a short podcast description" {...field} />
                        </FormControl>
                        <FormMessage className="text-white-1" />
                      </FormItem>
                  )}
              />
            </div>
            <div className="flex flex-col pt-10">
              {!isUsingMP3 && (
                  <GeneratePodcast
                      setAudioStorageId={setAudioStorageId}
                      setAudio={setAudioUrl}
                      voiceType={voiceType!}
                      audio={audioUrl}
                      voicePrompt={voicePrompt}
                      setVoicePrompt={setVoicePrompt}
                      setAudioDuration={setAudioDuration}
                  />
              )}

              <GenerateThumbnail
                  setImage={setImageUrl}
                  setImageStorageId={setImageStorageId}
                  image={imageUrl}
                  imagePrompt={imagePrompt}
                  setImagePrompt={setImagePrompt}
              />

              <div className="mt-10 w-full">
                <Button type="submit" className="text-16 w-full bg-orange-1 py-4 font-extrabold text-white-1 transition-all duration-500 hover:bg-black-1">
                  {isSubmitting ? (
                      <>
                        Submitting
                        <Loader size={20} className="animate-spin ml-2" />
                      </>
                  ) : (
                      'Submit & Publish Podcast'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </section>
  )
}

export default CreatePodcast;
