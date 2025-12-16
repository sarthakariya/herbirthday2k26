import { useState, useRef, useEffect, useCallback } from 'react';

export const useBlowDetection = () => {
  const [isBlowing, setIsBlowing] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const startAudio = useCallback(async () => {
    if (audioContextRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      sourceRef.current = source;

      const checkAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Blowing creates low-frequency noise. We focus on the lower spectrum.
        // We take the average of the lower half of the frequency data.
        let sum = 0;
        const lowerHalfCount = Math.floor(dataArrayRef.current.length / 2);
        for (let i = 0; i < lowerHalfCount; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / lowerHalfCount;

        // Threshold for "blowing". Adjust as needed. 
        // 40 is a reasonable baseline for a moderate blow close to the mic.
        const THRESHOLD = 40; 
        
        if (average > THRESHOLD) {
          setIsBlowing(true);
          // Normalized intensity 0-1 (roughly)
          setIntensity(Math.min((average - THRESHOLD) / 50, 1));
        } else {
          setIsBlowing(false);
          setIntensity(0);
        }

        rafIdRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsBlowing(false);
  }, []);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return { isBlowing, intensity, startAudio, stopAudio };
};
