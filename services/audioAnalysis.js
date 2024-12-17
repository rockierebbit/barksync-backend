// services/audioAnalysis.js
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import FFT from 'fft.js';

class AudioAnalyzer {
    constructor() {
        // Parametry analizy
        this.SAMPLE_RATE = 44100;
        this.MIN_SEGMENT_LENGTH = 0.05 * this.SAMPLE_RATE; // 50ms

        // Rozszerzone typy wokalizacji
        this.DOG_VOCALIZATIONS = {
            BARK: {
                type: 'Bark',
                freqRange: { min: 500, max: 4000 },
                emotionalRange: ['alert', 'excited', 'warning', 'attention']
            },
            GROWL: {
                type: 'Growl',
                freqRange: { min: 100, max: 1000 },
                emotionalRange: ['aggressive', 'warning', 'defensive', 'threatened']
            },
            WHINE: {
                type: 'Whine',
                freqRange: { min: 1000, max: 6000 },
                emotionalRange: ['anxious', 'stressed', 'needy', 'pain']
            },
            HOWL: {
                type: 'Howl',
                freqRange: { min: 300, max: 2000 },
                emotionalRange: ['lonely', 'social', 'responsive', 'distressed']
            },
            YIP: {
                type: 'Yip',
                freqRange: { min: 2000, max: 8000 },
                emotionalRange: ['excited', 'playful', 'startled', 'fearful']
            },
            WHIMPER: {
                type: 'Whimper',
                freqRange: { min: 800, max: 5000 },
                emotionalRange: ['submissive', 'nervous', 'uncertain', 'seeking comfort']
            }
        };

        // Rozszerzone stany emocjonalne
        this.EMOTIONAL_STATES = {
            POSITIVE: {
                PLAYFUL: { arousal: 0.7, valence: 0.8, dominance: 0.6 },
                CONTENT: { arousal: 0.3, valence: 0.8, dominance: 0.5 },
                EXCITED: { arousal: 0.9, valence: 0.7, dominance: 0.7 },
                SOCIAL: { arousal: 0.6, valence: 0.7, dominance: 0.5 }
            },
            NEGATIVE: {
                ANXIOUS: { arousal: 0.8, valence: 0.3, dominance: 0.3 },
                AGGRESSIVE: { arousal: 0.9, valence: 0.2, dominance: 0.9 },
                FEARFUL: { arousal: 0.8, valence: 0.2, dominance: 0.1 },
                FRUSTRATED: { arousal: 0.7, valence: 0.3, dominance: 0.6 }
            },
            NEUTRAL: {
                ALERT: { arousal: 0.6, valence: 0.5, dominance: 0.5 },
                CURIOUS: { arousal: 0.5, valence: 0.6, dominance: 0.4 },
                ATTENTIVE: { arousal: 0.4, valence: 0.5, dominance: 0.5 }
            }
        };

        this.fft = new FFT(2048); // Rozmiar FFT
    }

    async preprocessAudio(filePath) {
        console.log('Starting audio preprocessing for mobile:', filePath);
        const tempWavPath = filePath.replace(/\.[^/.]+$/, '') + '_temp.wav';

        try {
            // Konwersja do WAV - uproszczona dla urządzeń mobilnych
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .toFormat('wav')
                    .outputOptions([
                        '-ar 16000',
                        '-ac 1'
                    ])
                    .on('end', () => {
                        console.log('Audio conversion completed');
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Audio conversion error:', err);
                        reject(err);
                    })
                    .save(tempWavPath);
            });

            // Zamiast pełnej analizy audio, sprawdzamy podstawowe parametry
            const stats = await fs.stat(tempWavPath);
            const duration = await this.getAudioDuration(tempWavPath);

            await fs.unlink(tempWavPath);

            return {
                size: stats.size,
                duration: duration,
                format: 'wav'
            };
        } catch (error) {
            console.error('Error in audio preprocessing:', error);
            if (await fs.access(tempWavPath).catch(() => false)) {
                await fs.unlink(tempWavPath);
            }
            throw error;
        }
    }

    async getAudioDuration(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration);
            });
        });
    }

    async analyzeAudio(audioData) {
        console.log('Starting basic audio analysis...');
        try {
            // 1. Wczytaj bufor audio
            const buffer = await this.readAudioBuffer(audioData.path);
            console.log('Audio buffer loaded, length:', buffer.length);

            // 2. Podstawowa analiza częstotliwości
            const frequencies = this.analyzeFrequencies(buffer);
            console.log('Frequency analysis:', frequencies);

            // 3. Oblicz podstawowe charakterystyki
            const intensity = this.calculateIntensity(buffer);
            const duration = buffer.length / this.SAMPLE_RATE;

            // 4. Określ typ dźwięku na podstawie częstotliwości
            let soundType = 'Neutral';
            let emotionalState = 'Neutral';

            if (frequencies.fundamental < 200) {
                soundType = 'Growl';
                emotionalState = 'Warning';
            } else if (frequencies.fundamental > 1000) {
                soundType = 'Whine';
                emotionalState = 'Anxious';
            } else {
                soundType = 'Bark';
                emotionalState = intensity.max > 0.7 ? 'Excited' : 'Alert';
            }

            // 5. Przygotuj wynik
            const result = {
                audioCharacteristics: {
                    classification: {
                        barkType: soundType,
                        emotionalState: emotionalState
                    },
                    timing: {
                        duration: duration,
                        pattern: 'single'
                    },
                    intensity: {
                        max: intensity.max,
                        average: intensity.average,
                        description: intensity.description
                    }
                },
                analysis: {
                    aiInterpretation: `The dog is making a ${soundType.toLowerCase()} sound with ${intensity.description.toLowerCase()} intensity, suggesting a ${emotionalState.toLowerCase()} state.`
                },
                timestamp: new Date().toISOString()
            };

            console.log('Analysis result:', result);
            return result;

        } catch (error) {
            console.error('Error in audio analysis:', error);
            throw error;
        }
    }

    calculateIntensity(buffer) {
        const amplitudes = buffer.map(Math.abs);
        const max = Math.max(...amplitudes);
        const average = amplitudes.reduce((sum, val) => sum + val, 0) / amplitudes.length;
        
        let description = 'Moderate';
        if (max < 0.3) description = 'Low';
        if (max > 0.7) description = 'High';
        
        return { max, average, description };
    }

    analyzeFrequencies(buffer) {
        const fftResult = this.performFFT(buffer);
        const fundamental = this.findFundamentalFrequency(fftResult);
        
        return {
            fundamental,
            spectralCentroid: this.calculateSpectralCentroid(fftResult)
        };
    }

    async readAudioBuffer(filePath) {
        try {
            console.log('Reading audio buffer from:', filePath);
            // Użyj ffmpeg do konwersji do RAW PCM
            const rawPcmPath = filePath.replace('.wav', '_raw.pcm');
            
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .toFormat('s16le')  // 16-bit PCM
                    .audioChannels(1)    // mono
                    .audioFrequency(44100)
                    .on('end', resolve)
                    .on('error', reject)
                    .save(rawPcmPath);
            });

            // Wczytaj dane PCM
            const rawData = await fs.readFile(rawPcmPath);
            await fs.unlink(rawPcmPath); // Usuń tymczasowy plik

            // Konwertuj na Float32Array
            const buffer = new Float32Array(rawData.length / 2);
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = rawData.readInt16LE(i * 2) / 32768.0;
            }

            return buffer;
        } catch (error) {
            console.error('Error reading audio buffer:', error);
            throw error;
        }
    }

    performFFT(buffer) {
        // Przygotuj dane do FFT (musi być potęga 2)
        const size = 2048;
        const paddedBuffer = new Float32Array(size);
        paddedBuffer.set(buffer.slice(0, size));

        // Zastosuj okno Hamminga
        for (let i = 0; i < size; i++) {
            paddedBuffer[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
        }

        // Wykonaj FFT
        const out = this.fft.createComplexArray();
        this.fft.realTransform(out, paddedBuffer);

        // Oblicz magnitudy i częstotliwości
        const frequencies = new Float32Array(size/2);
        const magnitudes = new Float32Array(size/2);
        
        for (let i = 0; i < size/2; i++) {
            frequencies[i] = i * this.SAMPLE_RATE / size;
            magnitudes[i] = Math.sqrt(out[2*i] * out[2*i] + out[2*i+1] * out[2*i+1]);
        }

        return { frequencies, magnitudes };
    }

    findFundamentalFrequency(fftResult) {
        const { frequencies, magnitudes } = fftResult;
        
        // Znajdź najsilniejszą częstotliwość w zakresie psiego głosu (100Hz-8kHz)
        let maxMagnitude = 0;
        let fundamentalFreq = 0;
        
        for (let i = 0; i < frequencies.length; i++) {
            const freq = frequencies[i];
            if (freq >= 100 && freq <= 8000) {
                if (magnitudes[i] > maxMagnitude) {
                    maxMagnitude = magnitudes[i];
                    fundamentalFreq = freq;
                }
            }
        }
        
        return fundamentalFreq;
    }

    calculateSpectralCentroid(fftResult) {
        const { frequencies, magnitudes } = fftResult;
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < frequencies.length; i++) {
            weightedSum += frequencies[i] * magnitudes[i];
            magnitudeSum += magnitudes[i];
        }
        
        return magnitudeSum === 0 ? 0 : weightedSum / magnitudeSum;
    }
}

export const audioAnalyzer = new AudioAnalyzer();