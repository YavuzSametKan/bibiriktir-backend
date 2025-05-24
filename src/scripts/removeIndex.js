import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const removeIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB bağlantısı başarılı');

        const db = mongoose.connection.db;
        const collections = await db.collections();
        
        for (const collection of collections) {
            const indexes = await collection.indexes();
            console.log(`Koleksiyon: ${collection.collectionName}`);
            console.log('Mevcut indexler:', indexes);
            
            // name_1 index'ini kaldır
            if (indexes.some(index => index.name === 'name_1')) {
                await collection.dropIndex('name_1');
                console.log('name_1 index\'i kaldırıldı');
            }
        }

        console.log('İşlem tamamlandı');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
};

removeIndex(); 