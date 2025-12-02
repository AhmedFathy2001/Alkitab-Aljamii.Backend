import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, FacultyRole, ContentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import pg from 'pg';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// MinIO client setup
const minioClient = new Minio.Client({
    endPoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
    port: parseInt(process.env['MINIO_PORT'] ?? '9000', 10),
    useSSL: process.env['MINIO_USE_SSL'] === 'true',
    accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
    secretKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
});
const minioBucket = process.env['MINIO_BUCKET_NAME'] ?? 'alkitab-content';

// Helper function to upload file to MinIO
async function uploadToMinio(localFilePath: string, fileName: string): Promise<{ key: string; size: number }> {
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileExtension = fileName.split('.').pop() ?? '';
    const fileKey = `content/${uuidv4()}.${fileExtension}`;

    await minioClient.putObject(
        minioBucket,
        fileKey,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': 'application/pdf' }
    );

    return { key: fileKey, size: fileBuffer.length };
}

// Ensure MinIO bucket exists
async function ensureMinioBucket(): Promise<void> {
    const bucketExists = await minioClient.bucketExists(minioBucket);
    if (!bucketExists) {
        await minioClient.makeBucket(minioBucket);
        console.log(`✅ MinIO bucket created: ${minioBucket}`);
    } else {
        console.log(`✅ MinIO bucket exists: ${minioBucket}`);
    }
}

// Check if file exists in MinIO
async function checkMinioFileExists(key: string): Promise<boolean> {
    try {
        await minioClient.statObject(minioBucket, key);
        return true;
    } catch {
        return false;
    }
}

// ======== Seed Data ========

// Super Admin
const superAdmin = {
    email: 'admin@alkitab.com',
    password: 'Admin@123',
    firstName: 'Super',
    lastName: 'Admin',
    isSuperAdmin: true,
};

// Faculties
const faculties = [
  { code: 'CS', name: 'Faculty of Computer and Data Science' },
  { code: 'SC', name: 'Faculty of Science' },
  { code: 'ME', name: 'Faculty of Medicine' },
  { code: 'PH', name: 'Faculty of Pharmacy' },
  { code: 'EN', name: 'Faculty of Engineering' },
  { code: 'BS', name: 'Faculty of Business Administration' },
  { code: 'ED', name: 'Faculty of Education' },
  { code: 'LA', name: 'Faculty of Law' },
  { code: 'AR', name: 'Faculty of Arts' },
  { code: 'AG', name: 'Faculty of Agriculture' },
];


// Users
const users = [
  // Faculty admins
    { email: 'Magda192@gmail.com', firstName: 'Magda', lastName: 'Madbouly', password: 'magda12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'CS' },
    { email: 'Hanan456@gmail.com', firstName: 'Hanan', lastName: 'Mahamad', password: 'hanan12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'PH' },
    { email: 'Tamer567@gmail.com', firstName: 'Tamer', lastName: 'Abd_allah', password: 'tamer12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'ME' },
    { email: 'Mahamad965@gmail.com', firstName: 'Mahamad', lastName: 'Eisam', password: 'mahamad12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'SC' },
    { email: 'saeed474@gmail.com', firstName: 'Saeed', lastName: 'Mohamed', password: 'saeed12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'EN' },
    { email: 'ayman485@gmail.com', firstName: 'Ayman', lastName: 'Ahmed', password: 'ayman12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'BS' },
    { email: 'mohamed467@gmail.com', firstName: 'Mohamed', lastName: 'Anwar', password: 'mohamed12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'ED' },
    { email: 'talaat385@gmail.com', firstName: 'Talaat', lastName: 'Mohamed', password: 'talaat12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'LA' },
    { email: 'ghada493@gmail.com', firstName: 'Ghada', lastName: 'Abdel Moneam', password: 'ghada12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'AR' },
    { email: 'abdullah384@gmail.com', firstName: 'Abdullah', lastName: 'Zein', password: 'abdullah12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'AG' },
    // Professors CS
    { email: 'amr185@gmail.com', firstName: 'Amr', lastName: 'Amin', password: 'amr67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'mahmud586@gmail.com', firstName: 'Mahmud', lastName: 'Gamal', password: 'mahmud67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'yasser867@gmail.com', firstName: 'Yasser', lastName: 'Fouad', password: 'yasser67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'abeer790@gmail.com', firstName: 'Abeer', lastName: 'Amer', password: 'amer67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'adel088@gmail.com', firstName: 'Adel', lastName: 'El-zoghabi', password: 'adel67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'emad836@gmail.com', firstName: 'Emad', lastName: 'Raouf', password: 'emad67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },

  // Professors SC
    { email: 'yasser858@gmail.com', firstName: 'Yasser', lastName: 'Ayman', password: 'yasser67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'randa595@gmail.com', firstName: 'Randa', lastName: 'Ahmed', password: 'randa67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'shimaa443@gmail.com', firstName: 'Shimaa', lastName: 'Khaled', password: 'shimaa67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'ahmed334@gmail.com', firstName: 'Ahmed', lastName: 'Mostafa', password: 'ahmed67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'laila221@gmail.com', firstName: 'Laila', lastName: 'Hassan', password: 'laila67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'mohsen777@gmail.com', firstName: 'Mohsen', lastName: 'Saeed', password: 'mohsen67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },

  // Professors ME
    { email: 'hoda154@gmail.com', firstName: 'Hoda', lastName: 'Mostafa', password: 'hoda67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'Khaled599@gmail.com', firstName: 'Khaled', lastName: 'Mahamad', password: 'khaled67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'salma443@gmail.com', firstName: 'Salma', lastName: 'Younes', password: 'salma67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'mostafa331@gmail.com', firstName: 'Mostafa', lastName: 'Ibrahim', password: 'mostafa67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'hala221@gmail.com', firstName: 'Hala', lastName: 'Karem', password: 'hala67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'fathy999@gmail.com', firstName: 'Fathy', lastName: 'Mahrous', password: 'fathy67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
 // Professors PH
    { email: 'Sara683@gmail.com', firstName: 'Sara', lastName: 'Said', password: 'sara67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'Ali294@gmail.com', firstName: 'Ali', lastName: 'Ahmed', password: 'ali67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'mona442@gmail.com', firstName: 'Mona', lastName: 'Hassan', password: 'mona67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'hany334@gmail.com', firstName: 'Hany', lastName: 'Nabil', password: 'hany67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'lamia221@gmail.com', firstName: 'Lamia', lastName: 'Fouad', password: 'lamia67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'bassel777@gmail.com', firstName: 'Bassel', lastName: 'Salem', password: 'bassel67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
  // Professors EN
    { email: 'hassan690@gmail.com', firstName: 'Hassan', lastName: 'Othman', password: 'hassan67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
    { email: 'marw795a@gmail.com', firstName: 'Marwa', lastName: 'Lotfy', password: 'marwa67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
    { email: 'nader084@gmail.com', firstName: 'Nader', lastName: 'Samir', password: 'nader67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
    { email: 'riham955@gmail.com', firstName: 'Riham', lastName: 'Adel', password: 'riham67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
    { email: 'kareem@gmail.com', firstName: 'Kareem', lastName: 'Hesham', password: 'kareem67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
    { email: 'soha325@gmail.com', firstName: 'Soha', lastName: 'Fathy', password: 'soha67890', facultyRole: FacultyRole.professor, facultyCode: 'EN' },
  //Professors BS
    { email: 'ayman375@gmail.com', firstName: 'Ayman', lastName: 'Shtewi', password: 'ayman67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
    { email: 'nour923@gmail.com', firstName: 'Nour', lastName: 'Khaled', password: 'nour67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
    { email: 'rasha436@gmail.com', firstName: 'Rasha', lastName: 'Saeed', password: 'rasha67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
    { email: 'fady242@gmail.com', firstName: 'Fady', lastName: 'Ibrahim', password: 'fady67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
    { email: 'maha345@gmail.com', firstName: 'Maha', lastName: 'Fouad', password: 'maha67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
    { email: 'youssef435@gmail.com', firstName: 'Youssef', lastName: 'Adham', password: 'youssef67890', facultyRole: FacultyRole.professor, facultyCode: 'BS' },
  //Professors ED
    { email: 'hossam263@gmail.com', firstName: 'Hossam', lastName: 'Farag', password: 'hossam67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
    { email: 'nermin324@gmail.com', firstName: 'Nermin', lastName: 'Ali', password: 'nermin67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
    { email: 'amira738@gmail.com', firstName: 'Amira', lastName: 'Saber', password: 'amira67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
    { email: 'tarek237@gmail.com', firstName: 'Tarek', lastName: 'Mahmoud', password: 'tarek67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
    { email: 'shorouq283@gmail.com', firstName: 'Shorouq', lastName: 'Hamdy', password: 'shorouq67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
    { email: 'magdy463@gmail.com', firstName: 'Magdy', lastName: 'Nour', password: 'magdy67890', facultyRole: FacultyRole.professor, facultyCode: 'ED' },
  //Professors LA
    { email: 'talaat654@gmail.com', firstName: 'Talaat', lastName: 'Mahmoud', password: 'talaat67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
    { email: 'samar758@gmail.com', firstName: 'Samar', lastName: 'Khalil', password: 'samar67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
    { email: 'mostafa698@gmail.com', firstName: 'Mostafa', lastName: 'Reda', password: 'mostafa67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
    { email: 'eman689@gmail.com', firstName: 'Eman', lastName: 'Sayed', password: 'eman67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
    { email: 'sameh453@gmail.com', firstName: 'Sameh', lastName: 'Lotfy', password: 'sameh67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
    { email: 'riham132@gmail.com', firstName: 'Riham', lastName: 'Mohamed', password: 'riham67890', facultyRole: FacultyRole.professor, facultyCode: 'LA' },
  //Professors AR
    { email: 'ghada765@gmail.com', firstName: 'Ghada', lastName: 'Mousa', password: 'ghada67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
    { email: 'doaa432@gmail.com', firstName: 'Doaa', lastName: 'Yassin', password: 'doaa67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
    { email: 'ahmed233@gmail.com', firstName: 'Ahmed', lastName: 'Farouk', password: 'ahmed67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
    { email: 'lobna143@gmail.com', firstName: 'Lobna', lastName: 'Hamed', password: 'lobna67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
    { email: 'nada643@gmail.com', firstName: 'Nada', lastName: 'Tawfik', password: 'nada67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
    { email: 'omar216@gmail.com', firstName: 'Omar', lastName: 'Zaki', password: 'omar67890', facultyRole: FacultyRole.professor, facultyCode: 'AR' },
  //Professors AG
    { email: 'abdullah342@gmail.com', firstName: 'Abdullah', lastName: 'Zein', password: 'abdullah67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },
    { email: 'marian273@gmail.com', firstName: 'Marian', lastName: 'Botros', password: 'marian67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },
    { email: 'ashraf261@gmail.com', firstName: 'Ashraf', lastName: 'Selim', password: 'ashraf67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },
    { email: 'shady194@gmail.com', firstName: 'Shady', lastName: 'Hanna', password: 'shady67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },
    { email: 'noha217@gmail.com', firstName: 'Noha', lastName: 'Sharaf', password: 'noha67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },
    { email: 'ibrahim244@gmail.com', firstName: 'Ibrahim', lastName: 'Kamel', password: 'ibrahim67890', facultyRole: FacultyRole.professor, facultyCode: 'AG' },

  // Students CS
    { email: 'Ahmed790@gmail.com', firstName: 'Ahmed', lastName: 'Fathy', password: 'ahmed2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Rewan160@gmail.com', firstName: 'Rewan', lastName: 'Gaber', password: 'rewan2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Mariam795@gmail.com', firstName: 'Mariam', lastName: 'Ramadan', password: 'mariam2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Mahamed593@gmail.com', firstName: 'Mahamad', lastName: 'Abd-elwahab', password: 'mahamad2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'akram152@gmail.com', firstName: 'Akram', lastName: 'Yasser', password: 'akram2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'ranen@gmail.com', firstName: 'Ranen', lastName: 'Ashraf', password: 'ranen2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Ahmed695@gmail.com.com', firstName: 'Ahmed', lastName: 'Gamal', password: 'ahmed2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Ayman273@gmail.com.com', firstName: 'Ayman', lastName: 'Abd-elnaser', password: 'ayman2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Maha485@gmail.com.com', firstName: 'Maha', lastName: 'Maher', password: 'maha2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'mohab393@gmail.com.com', firstName: 'Mohab', lastName: 'Ahmed', password: 'mohab2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'seham384@gmail.com.com', firstName: 'Seham', lastName: 'Ahmed', password: 'seham2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Ayman273@gmail.com.com', firstName: 'Ayman', lastName: 'Rizk', password: 'ayman2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'motaz288@gmail.com.com', firstName: 'Motaz', lastName: 'Ahmed', password: 'motaz2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    
  // Students SC
    { email: 'ahmed1@gmail.com', firstName: 'Ahmed', lastName: 'Sami', password: 'ahmed1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'mona2@gmail.com', firstName: 'Mona', lastName: 'Adel', password: 'mona1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'karim3@gmail.com', firstName: 'Karim', lastName: 'Fouad', password: 'karim1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'noha4@gmail.com', firstName: 'Noha', lastName: 'Mahmoud', password: 'noha1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'ammar5@gmail.com', firstName: 'Ammar', lastName: 'Karam', password: 'ammar1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'hager6@gmail.com', firstName: 'Hager', lastName: 'Said', password: 'hager1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'samy7@gmail.com', firstName: 'Samy', lastName: 'Atef', password: 'samy1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'yara8@gmail.com', firstName: 'Yara', lastName: 'Khaled', password: 'yara1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'heba9@gmail.com', firstName: 'Heba', lastName: 'Reda', password: 'heba1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'mostafa10@gmail.com', firstName: 'Mostafa', lastName: 'Ashraf', password: 'mostafa1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'sara11@gmail.com', firstName: 'Sara', lastName: 'Nabil', password: 'sara1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'essam12@gmail.com', firstName: 'Essam', lastName: 'Fathy', password: 'essam1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'malika13@gmail.com', firstName: 'Malika', lastName: 'Hassan', password: 'malika1234', facultyRole: FacultyRole.student, facultyCode: 'SC' },
  // Students ME
    { email: 'salma149@gmail.com', firstName: 'Salma', lastName: 'Hesham', password: 'salma1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'fares302@gmail.com', firstName: 'Fares', lastName: 'Ali', password: 'fares1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'dina483@gmail.com', firstName: 'Dina', lastName: 'Mourad', password: 'dina1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'mohamed484@gmail.com', firstName: 'Mohamed', lastName: 'Saad', password: 'mohamed1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'sahar445@gmail.com', firstName: 'Sahar', lastName: 'Tarek', password: 'sahar1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'khaled211@gmail.com', firstName: 'Khaled', lastName: 'Ibrahim', password: 'khaled1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'mariam363@gmail.com', firstName: 'Mariam', lastName: 'Lotfy', password: 'mariam1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'youssef746@gmail.com', firstName: 'Youssef', lastName: 'Sami', password: 'youssef1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'eman151@gmail.com', firstName: 'Eman', lastName: 'Fouad', password: 'eman1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'hadi262@gmail.com', firstName: 'Hadi', lastName: 'Rafat', password: 'hadi1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'rana742@gmail.com', firstName: 'Rana', lastName: 'Maher', password: 'rana1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'tamer172@gmail.com', firstName: 'Tamer', lastName: 'Amin', password: 'tamer1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'hanaa722@gmail.com', firstName: 'Hanaa', lastName: 'Younes', password: 'hanaa1234', facultyRole: FacultyRole.student, facultyCode: 'ME' },
  // Students PH
    { email: 'nada831@gmail.com', firstName: 'Nada', lastName: 'Salem', password: 'nada1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'mina292@gmail.com', firstName: 'Mina', lastName: 'Bishoy', password: 'mina1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'rama253@gmail.com', firstName: 'Rama', lastName: 'Ashraf', password: 'rama1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'samy214@gmail.com', firstName: 'Samy', lastName: 'Farouk', password: 'samy1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'laila195@gmail.com', firstName: 'Laila', lastName: 'Hamed', password: 'laila1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'nour192@gmail.com', firstName: 'Nour', lastName: 'Omar', password: 'nour1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'hassan822@gmail.com', firstName: 'Hassan', lastName: 'Reda', password: 'hassan1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'amal8911@gmail.com', firstName: 'Amal', lastName: 'Salah', password: 'amal1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'hend935@gmail.com', firstName: 'Hend', lastName: 'Yasser', password: 'hend1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'maged102@gmail.com', firstName: 'Maged', lastName: 'Gamal', password: 'maged1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'sahar121@gmail.com', firstName: 'Sahar', lastName: 'Mahmoud', password: 'sahar1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'mustafa122@gmail.com', firstName: 'Mustafa', lastName: 'Saad', password: 'mustafa1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'reem132@gmail.com', firstName: 'Reem', lastName: 'Kareem', password: 'reem1234', facultyRole: FacultyRole.student, facultyCode: 'PH' },
  // Students BS
    { email: 'rana961@gmail.com', firstName: 'Rana', lastName: 'Samir', password: 'rana1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'samer217@gmail.com', firstName: 'Samer', lastName: 'Fouad', password: 'samer1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'dina322@gmail.com', firstName: 'Dina', lastName: 'Farid', password: 'dina1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'khaled674@gmail.com', firstName: 'Khaled', lastName: 'Ibrahim', password: 'khaled1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'yara785@gmail.com', firstName: 'Yara', lastName: 'Mahmoud', password: 'yara1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'hadi866@gmail.com', firstName: 'Hadi', lastName: 'Maged', password: 'hadi1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'salma687@gmail.com', firstName: 'Salma', lastName: 'Hossam', password: 'salma1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'tarek588@gmail.com', firstName: 'Tarek', lastName: 'Sami', password: 'tarek1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'noor985@gmail.com', firstName: 'Noor', lastName: 'Waleed', password: 'noor1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'fadi110@gmail.com', firstName: 'Fadi', lastName: 'Atef', password: 'fadi1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'hana111@gmail.com', firstName: 'Hana', lastName: 'Refaat', password: 'hana1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'mona112@gmail.com', firstName: 'Mona', lastName: 'Lotfy', password: 'mona1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
    { email: 'hashem113@gmail.com', firstName: 'Hashem', lastName: 'Galal', password: 'hashem1234', facultyRole: FacultyRole.student, facultyCode: 'BS' },
  // Students EN
    { email: 'faten16@gmail.com', firstName: 'Faten', lastName: 'Hassan', password: 'faten1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'ibrahim23@gmail.com', firstName: 'Ibrahim', lastName: 'Shawky', password: 'ibrahim1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'sahar31@gmail.com', firstName: 'Sahar', lastName: 'Nasser', password: 'sahar1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'adham44@gmail.com', firstName: 'Adham', lastName: 'Hamdy', password: 'adham1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'salma52@gmail.com', firstName: 'Salma', lastName: 'Emad', password: 'salma1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'zain64@gmail.com', firstName: 'Zain', lastName: 'Fathy', password: 'zain1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'marwan79@gmail.com', firstName: 'Marwan', lastName: 'Yehia', password: 'marwan1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'ehab81@gmail.com', firstName: 'Ehab', lastName: 'Kamal', password: 'ehab1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'hager95@gmail.com', firstName: 'Hager', lastName: 'Sobhy', password: 'hager1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'atef101@gmail.com', firstName: 'Atef', lastName: 'Raouf', password: 'atef1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'abir111@gmail.com', firstName: 'Abir', lastName: 'Lotfy', password: 'abir1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'karim182@gmail.com', firstName: 'Karim', lastName: 'Bassem', password: 'karim1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
    { email: 'heba183@gmail.com', firstName: 'Heba', lastName: 'Ezzat', password: 'heba1234', facultyRole: FacultyRole.student, facultyCode: 'EN' },
  // Students AG
    { email: 'hana18@gmail.com', firstName: 'Hana', lastName: 'Saeed', password: 'hana1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'raed92@gmail.com', firstName: 'Raed', lastName: 'Mahdy', password: 'raed1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'shahd93@gmail.com', firstName: 'Shahd', lastName: 'Fares', password: 'shahd1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'yassin94@gmail.com', firstName: 'Yassin', lastName: 'Gamal', password: 'yassin1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'mai85@gmail.com', firstName: 'Mai', lastName: 'Ayman', password: 'mai1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'hesham56@gmail.com', firstName: 'Hesham', lastName: 'Salah', password: 'hesham1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'lina47@gmail.com', firstName: 'Lina', lastName: 'Fouad', password: 'lina1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'mohsen38@gmail.com', firstName: 'Mohsen', lastName: 'Eid', password: 'mohsen1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'dalia29@gmail.com', firstName: 'Dalia', lastName: 'Tamer', password: 'dalia1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'nabil170@gmail.com', firstName: 'Nabil', lastName: 'Rami', password: 'nabil1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'aya171@gmail.com', firstName: 'Aya', lastName: 'Montaser', password: 'aya1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'farah102@gmail.com', firstName: 'Farah', lastName: 'Sameh', password: 'farah1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
    { email: 'shaker163@gmail.com', firstName: 'Shaker', lastName: 'Osama', password: 'shaker1234', facultyRole: FacultyRole.student, facultyCode: 'AG' },
  // Students AR
    { email: 'ahmed149@gmail.com', firstName: 'Ahmed', lastName: 'yassin', password: 'ahmed1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'nour72@gmail.com', firstName: 'Nour', lastName: 'Hassan', password: 'nour1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'laila33@gmail.com', firstName: 'Laila', lastName: 'Fathy', password: 'laila1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'omar34@gmail.com', firstName: 'Omar', lastName: 'Mahmoud', password: 'omar1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'sara54@gmail.com', firstName: 'Sara', lastName: 'Adel', password: 'sara1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'mohamed663@gmail.com', firstName: 'Mohamed', lastName: 'Reda', password: 'mohamed1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'aya721@gmail.com', firstName: 'Aya', lastName: 'Lotfy', password: 'aya1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'tarek84@gmail.com', firstName: 'Tarek', lastName: 'Saeed', password: 'tarek1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'dina945@gmail.com', firstName: 'Dina', lastName: 'Khaled', password: 'dina1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'youssef103@gmail.com', firstName: 'Youssef', lastName: 'Hany', password: 'youssef1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'reham131@gmail.com', firstName: 'Reham', lastName: 'Mohsen', password: 'reham1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'mona125@gmail.com', firstName: 'Mona', lastName: 'Farouk', password: 'mona1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
    { email: 'essam133@gmail.com', firstName: 'Essam', lastName: 'Ibrahim', password: 'essam1234', facultyRole: FacultyRole.student, facultyCode: 'AR' },
  // Students ED
    { email: 'ahmed81@gmail.com', firstName: 'Ahmed', lastName: 'Nabil', password: 'ahmed1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'fatma02@gmail.com', firstName: 'Fatma', lastName: 'Sami', password: 'fatma1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'marwan03@gmail.com', firstName: 'Marwan', lastName: 'Yehia', password: 'marwan1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'dina04@gmail.com', firstName: 'Dina', lastName: 'Ibrahim', password: 'dina1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'yara05@gmail.com', firstName: 'Yara', lastName: 'Atef', password: 'yara1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'tamer06@gmail.com', firstName: 'Tamer', lastName: 'Mahmoud', password: 'tamer1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'salma07@gmail.com', firstName: 'Salma', lastName: 'Fouad', password: 'salma1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'hossam08@gmail.com', firstName: 'Hossam', lastName: 'Farid', password: 'hossam1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'rania09@gmail.com', firstName: 'Rania', lastName: 'Kamal', password: 'rania1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'essam100@gmail.com', firstName: 'Essam', lastName: 'Reda', password: 'essam1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'mona181@gmail.com', firstName: 'Mona', lastName: 'Saeed', password: 'mona1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'hala162@gmail.com', firstName: 'Hala', lastName: 'Farouk', password: 'hala1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
    { email: 'youssef153@gmail.com', firstName: 'Youssef', lastName: 'Amin', password: 'youssef1234', facultyRole: FacultyRole.student, facultyCode: 'ED' },
  // Students LA
    { email: 'omar1@gmail.com', firstName: 'Omar', lastName: 'Sami', password: 'omar1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'ahmed2@gmail.com', firstName: 'Ahmed', lastName: 'Hassan', password: 'ahmed1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'sara3@gmail.com', firstName: 'Sara', lastName: 'Fathy', password: 'sara1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'hossam4@gmail.com', firstName: 'Hossam', lastName: 'Mahmoud', password: 'hossam1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'rana5@gmail.com', firstName: 'Rana', lastName: 'Reda', password: 'rana1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'mona6@gmail.com', firstName: 'Mona', lastName: 'Kamal', password: 'mona1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'karim7@gmail.com', firstName: 'Karim', lastName: 'Saeed', password: 'karim1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'fatma8@gmail.com', firstName: 'Fatma', lastName: 'Fouad', password: 'fatma1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'tamer9@gmail.com', firstName: 'Tamer', lastName: 'Ibrahim', password: 'tamer1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'yara10@gmail.com', firstName: 'Yara', lastName: 'Lotfy', password: 'yara1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'essam11@gmail.com', firstName: 'Essam', lastName: 'Maher', password: 'essam1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'mohamed12@gmail.com', firstName: 'Mohamed', lastName: 'Adel', password: 'mohamed1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
    { email: 'hala13@gmail.com', firstName: 'Hala', lastName: 'Sami', password: 'hala1234', facultyRole: FacultyRole.student, facultyCode: 'LA' },
];

// Subjects
const subjects = [
  // Subjects CS
  { code: 'CS101', name: 'Data Structures', facultyCode: 'CS' },
  { code: 'CS102', name: 'Big Data', facultyCode: 'CS' },
  { code: 'CS103', name: 'Operating Systems', facultyCode: 'CS' },
  { code: 'CS104', name: 'Database Systems', facultyCode: 'CS' },
  { code: 'CS105', name: 'Computer Networks', facultyCode: 'CS' },
  { code: 'CS106', name: 'Artificial Intelligence', facultyCode: 'CS' },
  { code: 'CS107', name: 'Machine Learning', facultyCode: 'CS' },
  { code: 'CS108', name: 'Software Engineering', facultyCode: 'CS' },
  { code: 'CS109', name: 'Cyber Security', facultyCode: 'CS' },
  { code: 'CS110', name: 'Cloud Computing', facultyCode: 'CS' },
  // Subjects SC
  { code: 'SC101', name: 'Calculus I', facultyCode: 'SC' },
  { code: 'SC102', name: 'Chemistry', facultyCode: 'SC' },
  { code: 'SC103', name: 'Physics I', facultyCode: 'SC' },
  { code: 'SC104', name: 'Biology', facultyCode: 'SC' },
  { code: 'SC105', name: 'Statistics', facultyCode: 'SC' },
  { code: 'SC106', name: 'Linear Algebra', facultyCode: 'SC' },
  { code: 'SC107', name: 'Organic Chemistry', facultyCode: 'SC' },
  { code: 'SC108', name: 'Environmental Science', facultyCode: 'SC' },
  { code: 'SC109', name: 'Genetics', facultyCode: 'SC' },
  { code: 'SC110', name: 'Quantum Mechanics', facultyCode: 'SC' },
  // Subjects ME
  { code: 'ME101', name: 'Physiology', facultyCode: 'ME' },
  { code: 'ME102', name: 'Anatomy', facultyCode: 'ME' },
  { code: 'ME103', name: 'Biochemistry', facultyCode: 'ME' },
  { code: 'ME104', name: 'Pharmacology', facultyCode: 'ME' },
  { code: 'ME105', name: 'Pathology', facultyCode: 'ME' },
  { code: 'ME106', name: 'Microbiology', facultyCode: 'ME' },
  { code: 'ME107', name: 'Immunology', facultyCode: 'ME' },
  { code: 'ME108', name: 'Clinical Medicine', facultyCode: 'ME' },
  { code: 'ME109', name: 'Surgery', facultyCode: 'ME' },
  { code: 'ME110', name: 'Medical Ethics', facultyCode: 'ME' },
  // Subjects PH
  { code: 'PH101', name: 'Biology', facultyCode: 'PH' },
  { code: 'PH102', name: 'Pharmacology', facultyCode: 'PH' },
  { code: 'PH103', name: 'Pharmaceutical Chemistry', facultyCode: 'PH' },
  { code: 'PH104', name: 'Pharmaceutics', facultyCode: 'PH' },
  { code: 'PH105', name: 'Clinical Pharmacy', facultyCode: 'PH' },
  { code: 'PH106', name: 'Toxicology', facultyCode: 'PH' },
  { code: 'PH107', name: 'Pharmacognosy', facultyCode: 'PH' },
  { code: 'PH108', name: 'Pharmaceutical Analysis', facultyCode: 'PH' },
  { code: 'PH109', name: 'Drug Delivery Systems', facultyCode: 'PH' },
  { code: 'PH110', name: 'Medicinal Chemistry', facultyCode: 'PH' },
  // Subjects EN
  { code: 'EN101', name: 'Engineering Mechanics', facultyCode: 'EN' },
  { code: 'EN102', name: 'Thermodynamics', facultyCode: 'EN' },
  { code: 'EN103', name: 'Fluid Mechanics', facultyCode: 'EN' },
  { code: 'EN104', name: 'Electrical Circuits', facultyCode: 'EN' },
  { code: 'EN105', name: 'Material Science', facultyCode: 'EN' },
  { code: 'EN106', name: 'Structural Analysis', facultyCode: 'EN' },
  { code: 'EN107', name: 'Control Systems', facultyCode: 'EN' },
  { code: 'EN108', name: 'Computer-Aided Design (CAD)', facultyCode: 'EN' },
  { code: 'EN109', name: 'Environmental Engineering', facultyCode: 'EN' },
  { code: 'EN110', name: 'Engineering Economics', facultyCode: 'EN' },
// Subjects BS
  { code: 'BS101', name: 'Accounting I', facultyCode: 'BS' },
  { code: 'BS102', name: 'Marketing Principles', facultyCode: 'BS' },
  { code: 'BS103', name: 'Microeconomics', facultyCode: 'BS' },
  { code: 'BS104', name: 'Macroeconomics', facultyCode: 'BS' },
  { code: 'BS105', name: 'Business Law', facultyCode: 'BS' },
  { code: 'BS106', name: 'Financial Management', facultyCode: 'BS' },
  { code: 'BS107', name: 'Human Resource Management', facultyCode: 'BS' },
  { code: 'BS108', name: 'Operations Management', facultyCode: 'BS' },
  { code: 'BS109', name: 'Entrepreneurship', facultyCode: 'BS' },
  { code: 'BS110', name: 'Business Ethics', facultyCode: 'BS' },
// Subjects ED
  { code: 'ED101', name: 'Foundations of Education', facultyCode: 'ED' },
  { code: 'ED102', name: 'Educational Psychology', facultyCode: 'ED' },
  { code: 'ED103', name: 'Curriculum Development', facultyCode: 'ED' },
  { code: 'ED104', name: 'Instructional Technology', facultyCode: 'ED' },
  { code: 'ED105', name: 'Classroom Management', facultyCode: 'ED' },
  { code: 'ED106', name: 'Assessment and Evaluation', facultyCode: 'ED' },
  { code: 'ED107', name: 'Special Education', facultyCode: 'ED' },
  { code: 'ED108', name: 'Educational Leadership', facultyCode: 'ED' },
  { code: 'ED109', name: 'Teaching Methods', facultyCode: 'ED' },
  { code: 'ED110', name: 'Comparative Education', facultyCode: 'ED' },
  // Subjects LA
  { code: 'LA101', name: 'Constitutional Law', facultyCode: 'LA' },
  { code: 'LA102', name: 'Criminal Law', facultyCode: 'LA' },
  { code: 'LA103', name: 'Civil Law', facultyCode: 'LA' },
  { code: 'LA104', name: 'International Law', facultyCode: 'LA' },
  { code: 'LA105', name: 'Commercial Law', facultyCode: 'LA' },
  { code: 'LA106', name: 'Labor Law', facultyCode: 'LA' },
  { code: 'LA107', name: 'Administrative Law', facultyCode: 'LA' },
  { code: 'LA108', name: 'Environmental Law', facultyCode: 'LA' },
  { code: 'LA109', name: 'Human Rights Law', facultyCode: 'LA' },
  { code: 'LA110', name: 'Intellectual Property Law', facultyCode: 'LA' },
  // Subjects AR
  { code: 'AR101', name: 'History of Arts', facultyCode: 'AR' },
  { code: 'AR102', name: 'Literature Analysis', facultyCode: 'AR' },
  { code: 'AR103', name: 'Philosophy', facultyCode: 'AR' },
  { code: 'AR104', name: 'Cultural Studies', facultyCode: 'AR' },
  { code: 'AR105', name: 'Psychology', facultyCode: 'AR' },
  { code: 'AR106', name: 'Sociology', facultyCode: 'AR' },
  { code: 'AR107', name: 'Linguistics', facultyCode: 'AR' },
  { code: 'AR108', name: 'Anthropology', facultyCode: 'AR' },
  { code: 'AR109', name: 'Media Studies', facultyCode: 'AR' },
  { code: 'AR110', name: 'Creative Writing', facultyCode: 'AR' },
  // Subjects AG
  { code: 'AG101', name: 'Crop Science', facultyCode: 'AG' },
  { code: 'AG102', name: 'Soil Science', facultyCode: 'AG' },
  { code: 'AG103', name: 'Agricultural Economics', facultyCode: 'AG' },
  { code: 'AG104', name: 'Plant Pathology', facultyCode: 'AG' },
  { code: 'AG105', name: 'Horticulture', facultyCode: 'AG' },
  { code: 'AG106', name: 'Animal Science', facultyCode: 'AG' },
  { code: 'AG107', name: 'Agricultural Engineering', facultyCode: 'AG' },
  { code: 'AG108', name: 'Entomology', facultyCode: 'AG' },
  { code: 'AG109', name: 'Irrigation Systems', facultyCode: 'AG' },
  { code: 'AG110', name: 'Agroecology', facultyCode: 'AG' },
];

// Contents - fileName refers to the file in prisma/files/ directory
const contentsData = [
// CS Subjects
{
  subjectCode: 'CS101',
  uploadedByEmail: 'amr185@gmail.com',
  contents: [
    { title: 'Data Structures Topics', fileName: 'ds_basics.pdf', contentType: ContentType.textbook },
    { title: 'DS Examples', fileName: 'ds_exercises.pdf', contentType: ContentType.other },
  ],
},
{
  subjectCode: 'CS102',
  uploadedByEmail: 'mahmud586@gmail.com',
  contents: [
    { title: 'Big Data Analytics', fileName: 'big_data_analytics.pdf', contentType: ContentType.textbook },
    { title: 'Big Data Lab Exercises', fileName: 'big_data_lab.pdf', contentType: ContentType.other },
  ],
},
{
  subjectCode: 'CS103',
  uploadedByEmail: 'yasser867@gmail.com',
  contents: [
    { title: 'Operating Systems Internals', fileName: 'alg_guide.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'CS104',
  uploadedByEmail: 'abeer790@gmail.com',
  contents: [
    { title: 'Database Management Systems Notes', fileName: 'alg_guide.pdf', contentType: ContentType.notes },
  ],
},

// SC Subjects
{
  subjectCode: 'SC101',
  uploadedByEmail: 'yasser858@gmail.com',
  contents: [
    { title: 'Calculus I Advanced Exercises', fileName: 'calc1.pdf', contentType: ContentType.other },
  ],
},
{
  subjectCode: 'SC102',
  uploadedByEmail: 'randa595@gmail.com',
  contents: [
    { title: 'Organic Chemistry Textbook', fileName: 'Microbiology.pdf', contentType: ContentType.textbook },
  ],
},

// ME Subjects
{
  subjectCode: 'ME101',
  uploadedByEmail: 'hoda154@gmail.com',
  contents: [
    { title: 'Physiology Practical Guide', fileName: 'Microbiology.pdf', contentType: ContentType.guide },
  ],
},
{
  subjectCode: 'ME102',
  uploadedByEmail: 'Khaled599@gmail.com',
  contents: [
    { title: 'Anatomy Reference ', fileName: 'ant_notes.pdf', contentType: ContentType.reference },
  ],
},

// PH Subjects
{
  subjectCode: 'PH101',
  uploadedByEmail: 'Sara683@gmail.com',
  contents: [
    { title: 'Biology Lab Manual', fileName: 'biology.pdf', contentType: ContentType.guide },
  ],
},
{
  subjectCode: 'PH102',
  uploadedByEmail: 'Ali294@gmail.com',
  contents: [
    { title: 'Pharmacology Case Studies', fileName: 'biology.pdf', contentType: ContentType.other },
  ],
},

// EN Subjects
{
  subjectCode: 'EN101',
  uploadedByEmail: 'hassan690@gmail.com',
  contents: [
    { title: 'Engineering Mechanics Problems', fileName: 'ds_basics.pdf', contentType: ContentType.other },
  ],
},
{
  subjectCode: 'EN102',
  uploadedByEmail: 'marw795a@gmail.com',
  contents: [
    { title: 'Thermodynamics Notes', fileName: 'alg_guide.pdf', contentType: ContentType.notes },
  ],
},

// BS Subjects
{
  subjectCode: 'BS101',
  uploadedByEmail: 'ayman375@gmail.com',
  contents: [
    { title: 'Accounting I Workbook', fileName: 'big_data_analytics.pdf', contentType: ContentType.other },
  ],
},
{
  subjectCode: 'BS102',
  uploadedByEmail: 'nour923@gmail.com',
  contents: [
    { title: 'Marketing Case Studies', fileName: 'big_data_analytics.pdf', contentType: ContentType.other },
  ],
},

// ED Subjects
{
  subjectCode: 'ED101',
  uploadedByEmail: 'hossam263@gmail.com',
  contents: [
    { title: 'Educational Psychology Notes', fileName: 'edu_psych.pdf', contentType: ContentType.notes },
  ],
},
{
  subjectCode: 'ED102',
  uploadedByEmail: 'nermin324@gmail.com',
  contents: [
    { title: 'Curriculum Development Guide', fileName: 'edu_psych.pdf', contentType: ContentType.guide },
  ],
},

// LA Subjects
{
  subjectCode: 'LA101',
  uploadedByEmail: 'talaat654@gmail.com',
  contents: [
    { title: 'Law Basics Textbook', fileName: 'alg_guide.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'LA102',
  uploadedByEmail: 'samar758@gmail.com',
  contents: [
    { title: 'International Law Notes', fileName: 'ant_notes.pdf', contentType: ContentType.notes },
  ],
},
// AR Subjects
{
  subjectCode: 'AR101',
  uploadedByEmail: 'ghada765@gmail.com',
  contents: [
    { title: 'Arabic Literature Textbook', fileName: 'big_data_analytics.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'AR102',
  uploadedByEmail: 'doaa432@gmail.com',
  contents: [
    { title: 'Arabic Grammar Notes', fileName: 'ant_notes.pdf', contentType: ContentType.notes },
  ],
},

// AG Subjects
{
  subjectCode: 'AG101',
  uploadedByEmail: 'abdullah342@gmail.com',
  contents: [
    { title: 'Agriculture Basics Textbook', fileName: 'ds_basics.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'AG102',
  uploadedByEmail: 'marian273@gmail.com',
  contents: [
    { title: 'Plant Science Notes', fileName: 'biology.pdf', contentType: ContentType.notes },
  ],
},
{
  subjectCode: 'CS104',
  uploadedByEmail: 'adel088@gmail.com',
  contents: [
    { title: 'Computer Networks Advanced', fileName: 'edu_psych.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'SC103',
  uploadedByEmail: 'shimaa443@gmail.com',
  contents: [
    { title: 'Physics II Guide', fileName: 'Microbiology.pdf', contentType: ContentType.guide },
  ],
},
{
  subjectCode: 'ME103',
  uploadedByEmail: 'salma443@gmail.com',
  contents: [
    { title: 'Pathology Notes', fileName: 'ant_notes.pdf', contentType: ContentType.notes },
  ],
},
{
  subjectCode: 'PH103',
  uploadedByEmail: 'mona442@gmail.com',
  contents: [
    { title: 'Pharmaceutical Analysis', fileName: 'Microbiology.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'EN103',
  uploadedByEmail: 'nader084@gmail.com',
  contents: [
    { title: 'Structural Analysis Notes', fileName: 'alg_guide.pdf', contentType: ContentType.notes },
  ],
},
{
  subjectCode: 'BS103',
  uploadedByEmail: 'rasha436@gmail.com',
  contents: [
    { title: 'Microeconomics Guide', fileName: 'Microbiology.pdf', contentType: ContentType.guide },
  ],
},
{
  subjectCode: 'ED103',
  uploadedByEmail: 'amira738@gmail.com',
  contents: [
    { title: 'Instructional Strategies', fileName: 'edu_psych.pdf', contentType: ContentType.guide },
  ],
},
{
  subjectCode: 'LA103',
  uploadedByEmail: 'mostafa698@gmail.com',
  contents: [
    { title: 'Civil Law Textbook', fileName: 'ds_basics.pdf', contentType: ContentType.textbook },
  ],
},
{
  subjectCode: 'AR103',
  uploadedByEmail: 'ahmed233@gmail.com',
  contents: [
    { title: 'Modern Arabic Literature Notes', fileName: 'ant_notes.pdf', contentType: ContentType.notes },
  ],
},
{
  subjectCode: 'AG103',
  uploadedByEmail: 'ashraf261@gmail.com',
  contents: [
    { title: 'Soil Science Guide', fileName: 'big_data_analytics.pdf', contentType: ContentType.guide },
  ],
},
];
// ======== Subject Assignments ========

// Assign Professors 
const professorAssignments = [
  // CS Faculty
  { email: 'amr185@gmail.com', subjectCodes: ['CS101','CS102'] },
  { email: 'mahmud586@gmail.com', subjectCodes: ['CS103','CS104'] },
  { email: 'yasser867@gmail.com', subjectCodes: ['CS105','CS106'] },
  { email: 'abeer790@gmail.com', subjectCodes: ['CS107','CS108'] },
  { email: 'adel088@gmail.com', subjectCodes: ['CS109','CS110'] },
  { email: 'emad836@gmail.com', subjectCodes: ['CS110','CS101'] }, 

  // SC Faculty
  { email: 'yasser858@gmail.com', subjectCodes: ['SC101','SC102'] },
  { email: 'randa595@gmail.com', subjectCodes: ['SC103','SC104'] },
  { email: 'shimaa443@gmail.com', subjectCodes: ['SC105','SC106'] },
  { email: 'ahmed334@gmail.com', subjectCodes: ['SC107','SC108'] },
  { email: 'laila221@gmail.com', subjectCodes: ['SC109','SC110'] },
  { email: 'mohsen777@gmail.com', subjectCodes: ['SC110','SC101'] },

  // ME Faculty
  { email: 'hoda154@gmail.com', subjectCodes: ['ME101','ME102'] },
  { email: 'Khaled599@gmail.com', subjectCodes: ['ME103','ME104'] },
  { email: 'salma443@gmail.com', subjectCodes: ['ME105','ME106'] },
  { email: 'mostafa331@gmail.com', subjectCodes: ['ME107','ME108'] },
  { email: 'hala221@gmail.com', subjectCodes: ['ME109','ME110'] },
  { email: 'fathy999@gmail.com', subjectCodes: ['ME110','ME101'] },

  // PH Faculty
  { email: 'Sara683@gmail.com', subjectCodes: ['PH101','PH102'] },
  { email: 'Ali294@gmail.com', subjectCodes: ['PH103','PH104'] },
  { email: 'mona442@gmail.com', subjectCodes: ['PH105','PH106'] },
  { email: 'hany334@gmail.com', subjectCodes: ['PH107','PH108'] },
  { email: 'lamia221@gmail.com', subjectCodes: ['PH109','PH110'] },
  { email: 'bassel777@gmail.com', subjectCodes: ['PH110','PH101'] },

  // EN Faculty
  { email: 'hassan690@gmail.com', subjectCodes: ['EN101','EN102'] },
  { email: 'marw795a@gmail.com', subjectCodes: ['EN103','EN104'] },
  { email: 'nader084@gmail.com', subjectCodes: ['EN105','EN106'] },
  { email: 'riham955@gmail.com', subjectCodes: ['EN107','EN108'] },
  { email: 'kareem@gmail.com', subjectCodes: ['EN109','EN106'] },
  { email: 'soha325@gmail.com', subjectCodes: ['EN110','EN101'] },

  // BS Faculty
  { email: 'ayman375@gmail.com', subjectCodes: ['BS101','BS102'] },
  { email: 'nour923@gmail.com', subjectCodes: ['BS103','BS104'] },
  { email: 'rasha436@gmail.com', subjectCodes: ['BS105','BS106'] },
  { email: 'fady242@gmail.com', subjectCodes: ['BS107','BS108'] },
  { email: 'maha345@gmail.com', subjectCodes: ['BS109','BS103'] },
  { email: 'youssef435@gmail.com', subjectCodes: ['BS110','BS101'] },

  // ED Faculty
  { email: 'hossam263@gmail.com', subjectCodes: ['ED101','ED102'] },
  { email: 'nermin324@gmail.com', subjectCodes: ['ED103','ED104'] },
  { email: 'amira738@gmail.com', subjectCodes: ['ED105','ED106'] },
  { email: 'tarek237@gmail.com', subjectCodes: ['ED107','ED108'] },
  { email: 'shorouq283@gmail.com', subjectCodes: ['ED109'] },
  { email: 'magdy463@gmail.com', subjectCodes: ['ED110','ED101','ED105'] },

  // LA Faculty
  { email: 'talaat654@gmail.com', subjectCodes: ['LA101','LA102'] },
  { email: 'samar758@gmail.com', subjectCodes: ['LA103','LA104'] },
  { email: 'mostafa698@gmail.com', subjectCodes: ['LA105','LA106','LA104'] },
  { email: 'eman689@gmail.com', subjectCodes: ['LA107','LA108'] },
  { email: 'sameh453@gmail.com', subjectCodes: ['LA109','LA106'] },
  { email: 'riham132@gmail.com', subjectCodes: ['LA110','LA101'] },

  // AR Faculty
  { email: 'ghada765@gmail.com', subjectCodes: ['AR101','AR102'] },
  { email: 'doaa432@gmail.com', subjectCodes: ['AR103','AR104'] },
  { email: 'ahmed233@gmail.com', subjectCodes: ['AR105','AR106'] },
  { email: 'lobna143@gmail.com', subjectCodes: ['AR107','AR108'] },
  { email: 'nada643@gmail.com', subjectCodes: ['AR109','AR106'] },
  { email: 'omar216@gmail.com', subjectCodes: ['AR110','AR101'] },

  // AG Faculty
  { email: 'abdullah342@gmail.com', subjectCodes: ['AG101','AG102'] },
  { email: 'marian273@gmail.com', subjectCodes: ['AG103','AG104'] },
  { email: 'ashraf261@gmail.com', subjectCodes: ['AG105','AG106'] },
  { email: 'shady194@gmail.com', subjectCodes: ['AG107','AG108'] },
  { email: 'noha217@gmail.com', subjectCodes: ['AG109'] },
  { email: 'ibrahim244@gmail.com', subjectCodes: ['AG110','AG101'] },
];

const facultiesMap: Record<string, { code: string; name: string }[]> = {};

subjects.forEach(subj => {
  if (!facultiesMap[subj.facultyCode]) {
    facultiesMap[subj.facultyCode] = [];
  }
  facultiesMap[subj.facultyCode].push({ code: subj.code, name: subj.name });
});

// 2. Assign students
const students = users.filter(u => u.facultyRole === FacultyRole.student);

const studentAssignments = students.map((student, idx) => {
  const subjectsOfFaculty = facultiesMap[student.facultyCode];

  if (!subjectsOfFaculty || subjectsOfFaculty.length === 0) {
    console.warn(`⚠️ No subjects found for facultyCode: ${student.facultyCode}`);
    return { email: student.email, subjectCodes: [] };
  }

  // توزيع deterministic: كل طالب ياخد أول مادة + المادة التالية بالتناوب
  const subjectCodes = [
    subjectsOfFaculty[idx % subjectsOfFaculty.length].code,
    subjectsOfFaculty[(idx + 1) % subjectsOfFaculty.length].code,
  ];

  return { email: student.email, subjectCodes };
});


// ======== Seed Functions ========

async function seedSuperAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: superAdmin.email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(superAdmin.password, 10);
    await prisma.user.create({
      data: {
        email: superAdmin.email,
        passwordHash,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        isSuperAdmin: true,
      },
    });
    console.log(`✅ Super admin created: ${superAdmin.email}`);
  } else {
    console.log(`⚠️ Super admin already exists: ${superAdmin.email}`);
  }
}

async function seedFaculties() {
  for (const f of faculties) {
    const existing = await prisma.faculty.findUnique({ where: { code: f.code } });
    if (!existing) {
      await prisma.faculty.create({ data: { code: f.code, name: f.name } });
      console.log(`✅ Faculty created: ${f.name}`);
    }
  }
}

async function seedUsers() {
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const user = await prisma.user.create({
        data: {
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
        },
      });
      const faculty = await prisma.faculty.findUnique({ where: { code: u.facultyCode } });
      if (faculty && u.facultyRole) {
        await prisma.userFacultyRole.create({
          data: {
            userId: user.id,
            facultyId: faculty.id,
            role: u.facultyRole,
          },
        });
      }
      console.log(`✅ User created: ${u.email}`);
    }
  }
}

async function seedSubjects() {
  for (const s of subjects) {
    const faculty = await prisma.faculty.findUnique({ where: { code: s.facultyCode } });
    if (!faculty) continue;

    const existing = await prisma.subject.findFirst({ where: { code: s.code, facultyId: faculty.id } });
    if (!existing) {
      await prisma.subject.create({
        data: {
          code: s.code,
          name: s.name,
          facultyId: faculty.id,
        },
      });
      console.log(`✅ Subject created: ${s.name}`);
    }
  }
}

async function seedContents() {
  // Get the directory where seed files are located
  const seedFilesDir = path.join(__dirname, '..', 'files');

  for (const entry of contentsData) {
    const subject = await prisma.subject.findFirst({ where: { code: entry.subjectCode } });
    if (!subject) continue;

    const uploader = await prisma.user.findUnique({ where: { email: entry.uploadedByEmail } });
    if (!uploader) continue;

    for (const content of entry.contents) {
      const existing = await prisma.content.findFirst({
        where: { subjectId: subject.id, title: content.title, uploadedById: uploader.id },
      });

      // Build the local file path
      const localFilePath = path.join(seedFilesDir, content.fileName);

      // Check if the file exists locally
      if (!fs.existsSync(localFilePath)) {
        console.log(`⚠️ File not found: ${localFilePath}, skipping ${content.title}`);
        continue;
      }

      if (existing) {
        // Check if file exists in MinIO, re-upload if missing
        const fileExistsInMinio = await checkMinioFileExists(existing.filePath);
        if (!fileExistsInMinio) {
          const { key: minioKey, size: fileSize } = await uploadToMinio(localFilePath, content.fileName);
          console.log(`📤 Re-uploaded to MinIO: ${content.fileName} -> ${minioKey}`);

          // Update the database record with new MinIO key
          await prisma.content.update({
            where: { id: existing.id },
            data: {
              filePath: minioKey,
              fileSize: BigInt(fileSize),
            },
          });
          console.log(`🔄 Content updated: ${content.title}`);
        } else {
          console.log(`⏭️ Content already exists: ${content.title}`);
        }
      } else {
        // Upload to MinIO and get the key
        const { key: minioKey, size: fileSize } = await uploadToMinio(localFilePath, content.fileName);
        console.log(`📤 Uploaded to MinIO: ${content.fileName} -> ${minioKey}`);

        await prisma.content.create({
          data: {
            subjectId: subject.id,
            uploadedById: uploader.id,
            title: content.title,
            description: content.title + " description",
            fileName: content.fileName,
            filePath: minioKey,
            mimeType: 'application/pdf',
            contentType: content.contentType,
            fileSize: BigInt(fileSize),
            pageCount: 100,
          },
        });
        console.log(`✅ Content created: ${content.title}`);
      }
    }
  }
}
// ======== Seed Function for Static Assignments ========

async function seedStaticAssignments() {
  console.log('🌱 Assigning professors and students to subjects (static)...');

  for (const prof of professorAssignments) {
    const user = await prisma.user.findUnique({ where: { email: prof.email } });
    if (!user) continue;

    for (const code of prof.subjectCodes) {
      const subject = await prisma.subject.findFirst({ where: { code } });
      if (!subject) continue;

      const exists = await prisma.userSubjectAssignment.findFirst({
        where: { userId: user.id, subjectId: subject.id },
      });
      if (!exists) {
        await prisma.userSubjectAssignment.create({
          data: { userId: user.id, subjectId: subject.id, roleInSubject: 'professor' },
        });
        console.log(`✅ Professor ${user.firstName} assigned to ${subject.name}`);
      }
    }
  }

  for (const stu of studentAssignments) {
    const user = await prisma.user.findUnique({ where: { email: stu.email } });
    if (!user) continue;

    for (const code of stu.subjectCodes) {
      const subject = await prisma.subject.findFirst({ where: { code } });
      if (!subject) continue;

      const exists = await prisma.userSubjectAssignment.findFirst({
        where: { userId: user.id, subjectId: subject.id },
      });
      if (!exists) {
        await prisma.userSubjectAssignment.create({
          data: { userId: user.id, subjectId: subject.id, roleInSubject: 'student' },
        });
        console.log(`✅ Student ${user.firstName} assigned to ${subject.name}`);
      }
    }
  }
}


// ======== Run Seed ========

async function seedAll() {
  try {
    console.log('🌱 Starting realistic full database seed...\n');
    await ensureMinioBucket();
    await seedSuperAdmin();
    await seedFaculties();
    await seedUsers();
    await seedSubjects();
    await seedContents();
    await seedStaticAssignments();
    console.log('\n🎉 Realistic full database seed completed successfully!');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Seed failed:', message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void seedAll();
