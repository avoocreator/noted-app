import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';

export interface DetectedBarcode {
  rawValue: string;
  format?: string;
}

export interface BarcodeDetectorOptions {
  formats?: string[];
}

export interface IBarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: BarcodeDetectorOptions): IBarcodeDetector;
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

export interface ScannerModalProps {
  title?: string;
  onClose: () => void;
  onScan: (code: string) => void;
}

type ScannerStatus = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'error';

export function ScannerModal({
  title = 'Pindai QR Jadwal',
  onClose,
  onScan,
}: ScannerModalProps) {
  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef<boolean>(true);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    activeRef.current = false;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    activeRef.current = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    if (typeof window === 'undefined' || !window.BarcodeDetector) {
      setStatus('unsupported');
      setErrorMsg('Peramban ini belum mendukung BarcodeDetector API bawaan.');
      return () => {
        document.removeEventListener('keydown', onKey);
      };
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setErrorMsg('Akses media kamera tidak tersedia di lingkungan ini.');
      return () => {
        document.removeEventListener('keydown', onKey);
      };
    }

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted || !activeRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        if (mounted) {
          setStatus('scanning');

          let detector: IBarcodeDetector;
          try {
            detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
          } catch {
            detector = new window.BarcodeDetector!();
          }

          const scanFrame = async () => {
            if (!activeRef.current) return;
            const v = videoRef.current;
            if (v && v.readyState >= 2) {
              try {
                const barcodes = await detector.detect(v);
                if (barcodes.length > 0 && activeRef.current) {
                  const raw = barcodes[0].rawValue?.trim();
                  if (raw) {
                    activeRef.current = false;
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      try {
                        navigator.vibrate(40);
                      } catch {}
                    }
                    stopCamera();
                    onScan(raw);
                    return;
                  }
                }
              } catch {}
            }
            if (activeRef.current) {
              timerRef.current = window.setTimeout(() => void scanFrame(), 200);
            }
          };

          timerRef.current = window.setTimeout(() => void scanFrame(), 200);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        if (
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        ) {
          setStatus('denied');
          setErrorMsg('Izin kamera ditolak. Silakan berikan izin kamera di setelan aplikasi atau peramban.');
        } else if (
          err instanceof DOMException &&
          (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')
        ) {
          setStatus('error');
          setErrorMsg('Tidak ada kamera yang ditemukan pada perangkat ini.');
        } else {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : 'Gagal membuka kamera.');
        }
      }
    };

    void start();

    return () => {
      mounted = false;
      document.removeEventListener('keydown', onKey);
      stopCamera();
    };
  }, [onClose, onScan]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (typeof window === 'undefined' || !window.BarcodeDetector) {
      setStatus('unsupported');
      setErrorMsg('Peramban ini belum mendukung BarcodeDetector API untuk membaca berkas gambar.');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat berkas gambar'));
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const maxDim = 1280;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Gagal inisialisasi decoder canvas');
      ctx.drawImage(img, 0, 0, w, h);

      let detector: IBarcodeDetector;
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = new window.BarcodeDetector();
      }

      const barcodes = await detector.detect(canvas);
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue?.trim();
        if (raw) {
          stopCamera();
          onScan(raw);
          return;
        }
      }
      setErrorMsg('Tidak ditemukan QR code pada gambar yang dipilih.');
      setStatus('error');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membaca berkas gambar.');
      setStatus('error');
    }
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim" onClick={onClose} />
      <div className="modal-card">
        <header className="sheet-head">
          <b>{title}</b>
          <button className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        {(status === 'scanning' || status === 'starting') && (
          <div className="scanner-view" aria-label="Jendela bidik pemindai QR">
            <video
              ref={videoRef}
              className="scanner-video"
              playsInline
              muted
              autoPlay
            />
            <div className="scanner-reticle" aria-hidden="true">
              <div className="scanner-laser" />
            </div>
          </div>
        )}

        {status === 'starting' && (
          <p className="muted small">Menyiapkan kamera…</p>
        )}

        {status === 'scanning' && (
          <p className="muted small">
            Arahkan kamera ke QR code jadwal kelas temanmu.
          </p>
        )}

        {(status === 'unsupported' || status === 'denied' || status === 'error') && (
          <div className="warn" style={{ width: '100%', textAlign: 'left' }}>
            <p className="danger" style={{ fontWeight: 600, marginBottom: 4 }}>
              {status === 'unsupported'
                ? 'Peramban Tidak Mendukung'
                : status === 'denied'
                  ? 'Izin Kamera Dibutuhkan'
                  : 'Pemberitahuan Pemindai'}
            </p>
            <p className="small muted">{errorMsg}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="row wrap gap center" style={{ width: '100%', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn soft"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" size={18} /> Pilih gambar dari galeri
          </button>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
