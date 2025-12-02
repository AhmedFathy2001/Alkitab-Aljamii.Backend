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
    { code: 'CS', name: 'Faculty of Computer and data Science' },
    { code: 'SC', name: 'Faculty of Science' },
    { code: 'ME', name: 'Faculty of Medicine' },
    { code: 'PH', name: 'Faculty of Pharmacy' },
];

// Users
const users = [
  // Faculty admins
    { email: 'Magda192@gmail.com', firstName: 'Magda', lastName: 'Madbouly', password: 'magda12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'CS' },
    { email: 'Hanan456@gmail.com', firstName: 'Hanan', lastName: 'Mahamad', password: 'hanan12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'PH' },
    { email: 'Tamer567@gmail.com', firstName: 'Tamer', lastName: 'Abd_allah', password: 'tamer12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'ME' },
    { email: 'Mahamad965@gmail.com', firstName: 'Mahamad', lastName: 'Eisam', password: 'mahamad12345', facultyRole: FacultyRole.faculty_admin, facultyCode: 'SC' },
  // Professors CS
    { email: 'amr185@gmail.com', firstName: 'Amr', lastName: 'Amin', password: 'amr67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },
    { email: 'mahmud586@gmail.com', firstName: 'Mahmud', lastName: 'Gamal', password: 'mahmud67890', facultyRole: FacultyRole.professor, facultyCode: 'CS' },

  // Professors SC
    { email: 'yasser858@gmail.com', firstName: 'Yasser', lastName: 'Ayman', password: 'yasser67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },
    { email: 'randa595@gmail.com', firstName: 'Randa', lastName: 'Ahmed', password: 'randa67890', facultyRole: FacultyRole.professor, facultyCode: 'SC' },

  // Professors ME
    { email: 'hoda154@gmail.com', firstName: 'Hoda', lastName: 'Mostafa', password: 'hoda67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },
    { email: 'Khaled599@gmail.com', firstName: 'Khaled', lastName: 'Mahamad', password: 'khaled67890', facultyRole: FacultyRole.professor, facultyCode: 'ME' },

 // Professors PH
    { email: 'Sara683@gmail.com', firstName: 'Sara', lastName: 'Said', password: 'sara67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },
    { email: 'Ali294@gmail.com', firstName: 'Ali', lastName: 'Ahmed', password: 'ali67890', facultyRole: FacultyRole.professor, facultyCode: 'PH' },

  // Students CS
    { email: 'Ahmed790@gmail.com', firstName: 'Ahmed', lastName: 'Fathy', password: 'ahmed2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Rewan160@gmail.com', firstName: 'Rewan', lastName: 'Gaber', password: 'rewan2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Mariam795@gmail.com', firstName: 'Mariam', lastName: 'Ramadan', password: 'mariam2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },
    { email: 'Mahamed593@gmail.com', firstName: 'Mahamad', lastName: 'Abd-elwahab', password: 'mahamad2345', facultyRole: FacultyRole.student, facultyCode: 'CS' },

  // Students SC
    { email: 'akram152@gmail.com', firstName: 'Akram', lastName: 'Yasser', password: 'akram2345', facultyRole: FacultyRole.student, facultyCode: 'SC' },
    { email: 'ranen@gmail.com', firstName: 'Ranen', lastName: 'Ashraf', password: 'ranen2345', facultyRole: FacultyRole.student, facultyCode: 'SC' },

  // Students ME
    { email: 'Ahmed695@gmail.com.com', firstName: 'Ahmed', lastName: 'Gamal', password: 'ahmed2345', facultyRole: FacultyRole.student, facultyCode: 'ME' },
    { email: 'Ayman273@gmail.com.com', firstName: 'Ayman', lastName: 'Abd-elnaser', password: 'ayman2345', facultyRole: FacultyRole.student, facultyCode: 'ME' },
  // Students PH
    { email: 'Maha485@gmail.com.com', firstName: 'Maha', lastName: 'Maher', password: 'maha2345', facultyRole: FacultyRole.student, facultyCode: 'PH' },
    { email: 'mohab393@gmail.com.com', firstName: 'Mohab', lastName: 'Ahmed', password: 'mohab2345', facultyRole: FacultyRole.student, facultyCode: 'PH' },
];

// Subjects
const subjects = [
    { code: 'CS101', name: 'Data Structures', facultyCode: 'CS' },
    { code: 'CS102', name: 'Big Data', facultyCode: 'CS' },
    { code: 'CS103', name: 'Operating Systems', facultyCode: 'CS' },
    { code: 'SC101', name: 'Calculus I', facultyCode: 'SC' },
    { code: 'SC102', name: 'Chemistry', facultyCode: 'SC' },
    { code: 'ME102', name: 'Anatomy', facultyCode: 'ME' },
    { code: 'ME101', name: 'Physiology', facultyCode: 'ME' },
    { code: 'PH102', name: 'Pharmacology', facultyCode: 'PH' },
    { code: 'PH101', name: 'biology', facultyCode: 'PH' },
];

// Contents - fileName refers to the file in prisma/files/ directory
const contentsData = [
{
    subjectCode: 'CS101',
    uploadedByEmail: 'mahmud586@gmail.com',
    contents: [
        { title: 'Data Structures Basics', fileName: 'ds_basics.pdf', contentType: ContentType.textbook },
        { title: 'DS Exercises', fileName: 'ds_exercises.pdf', contentType: ContentType.other },
    ],
},
{
    subjectCode: 'CS102',
    uploadedByEmail: 'amr185@gmail.com',
    contents: [
        { title: 'Algorithms Guide', fileName: 'alg_guide.pdf', contentType: ContentType.guide },
    ],
},
{
    subjectCode: 'SC101',
    uploadedByEmail: 'yasser858@gmail.com',
    contents: [
        { title: 'Calculus I', fileName: 'calc1.pdf', contentType: ContentType.textbook },
    ],
},
{
    subjectCode: 'ME102',
    uploadedByEmail: 'Khaled599@gmail.com',
    contents: [
        { title: 'Anatomy Notes', fileName: 'ant_notes.pdf', contentType: ContentType.notes },
    ],
},
{
    subjectCode: 'PH101',
    uploadedByEmail: 'Sara683@gmail.com',
    contents: [
        { title: 'biology Works', fileName: 'biology.pdf', contentType: ContentType.textbook },
        { title: 'Medical Microbiology', fileName: 'Microbiology.pdf', contentType: ContentType.reference },
    ],
},
];
// ======== Subject Assignments ========

// Assign Professors 
const professorAssignments = [
  { email: 'amr185@gmail.com', subjectCodes: ['CS101', 'CS102'] },
  { email: 'mahmud586@gmail.com', subjectCodes: ['CS103','CS102'] },
  { email: 'yasser858@gmail.com', subjectCodes: ['SC101'] },
  { email: 'randa595@gmail.com', subjectCodes: ['SC102'] },
  { email: 'hoda154@gmail.com', subjectCodes: ['ME101'] },
  { email: 'Khaled599@gmail.com', subjectCodes: ['ME102','ME101'] },
  { email: 'Sara683@gmail.com', subjectCodes: ['PH101'] },
  { email: 'Ali294@gmail.com', subjectCodes: ['PH102'] },
];

// Assign Students 
const studentAssignments = [
  { email: 'Ahmed790@gmail.com', subjectCodes: ['CS101', 'CS102'] },
  { email: 'Rewan160@gmail.com', subjectCodes: ['CS102', 'CS103'] },
  { email: 'Mariam795@gmail.com', subjectCodes: ['CS101', 'CS103'] },
  { email: 'Mahamed593@gmail.com', subjectCodes: ['CS101', 'CS102', 'CS103'] },
  { email: 'akram152@gmail.com', subjectCodes: ['SC101', 'SC102'] },
  { email: 'ranen@gmail.com', subjectCodes: ['SC101'] },
  { email: 'Ahmed695@gmail.com.com', subjectCodes: ['ME101', 'ME102'] },
  { email: 'Ayman273@gmail.com.com', subjectCodes: ['ME102'] },
  { email: 'Maha485@gmail.com.com', subjectCodes: ['PH101'] },
  { email: 'mohab393@gmail.com.com', subjectCodes: ['PH101', 'PH102'] },
];

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
