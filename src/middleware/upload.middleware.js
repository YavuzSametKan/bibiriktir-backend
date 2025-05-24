import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// İzin verilen dosya tipleri
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf'
];

// Dosya boyutu limiti (2MB)
const maxFileSize = 2 * 1024 * 1024;

// Uploads dizini yolunu al
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

// Uploads dizinini kontrol et ve oluştur
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Uploads dizini oluşturuldu:', uploadDir);
}

// Storage konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Dosya yükleme dizini:', uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        console.log('Yüklenen dosya:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        // Orijinal dosya uzantısını al
        const ext = path.extname(file.originalname);
        // Benzersiz dosya adı oluştur
        const filename = `${uuidv4()}${ext}`;
        console.log('Oluşturulan dosya adı:', filename);
        
        cb(null, filename);
    }
});

// Dosya filtreleme
const fileFilter = (req, file, cb) => {
    console.log('Dosya filtresi - Gelen dosya:', {
        originalname: file.originalname,
        mimetype: file.mimetype
    });

    if (allowedMimeTypes.includes(file.mimetype)) {
        console.log('Dosya tipi kabul edildi');
        cb(null, true);
    } else {
        console.log('Desteklenmeyen dosya tipi:', file.mimetype);
        cb(new Error(`Desteklenmeyen dosya formatı. Sadece ${allowedMimeTypes.join(', ')} dosyaları yüklenebilir.`), false);
    }
};

// Multer konfigürasyonu
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: maxFileSize
    }
});

// Hata yönetimi middleware'i
export const handleUploadError = (err, req, res, next) => {
    console.log('Upload hatası:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Dosya boyutu 2MB\'dan büyük olamaz'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Dosya yükleme hatası: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next();
};

export default upload; 