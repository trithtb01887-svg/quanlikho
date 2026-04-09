import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // CLEAR EXISTING DATA
  // ============================================
  console.log('🧹 Clearing existing data...');
  
  await prisma.auditLog.deleteMany();
  await prisma.inventoryAlert.deleteMany();
  await prisma.stocktakeDiscrepancy.deleteMany();
  await prisma.stocktakeSession.deleteMany();
  await prisma.goodsIssueItem.deleteMany();
  await prisma.goodsIssue.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.serialNumber.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplierBarcode.deleteMany();
  await prisma.supplierBankAccount.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // CREATE USERS
  // ============================================
  console.log('👥 Creating users...');

  const admin = await prisma.user.create({
    data: {
      employeeId: 'EMP001',
      username: 'admin',
      email: 'admin@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Nguyễn',
      lastName: 'Văn Admin',
      fullName: 'Nguyễn Văn Admin',
      phone: '0901234567',
      role: 'ADMIN',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const warehouseManager = await prisma.user.create({
    data: {
      employeeId: 'EMP002',
      username: 'kho.truong',
      email: 'kho.truong@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Trần',
      lastName: 'Thị Quản Lý',
      fullName: 'Trần Thị Quản Lý',
      phone: '0902345678',
      role: 'WAREHOUSE_MANAGER',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const warehouseStaff1 = await prisma.user.create({
    data: {
      employeeId: 'EMP003',
      username: 'kho.nhanvien1',
      email: 'kho.nhanvien1@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Lê',
      lastName: 'Văn Nhân Viên 1',
      fullName: 'Lê Văn Nhân Viên 1',
      phone: '0903456789',
      role: 'WAREHOUSE_STAFF',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const warehouseStaff2 = await prisma.user.create({
    data: {
      employeeId: 'EMP004',
      username: 'kho.nhanvien2',
      email: 'kho.nhanvien2@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Phạm',
      lastName: 'Thị Nhân Viên 2',
      fullName: 'Phạm Thị Nhân Viên 2',
      phone: '0904567890',
      role: 'WAREHOUSE_STAFF',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const purchaser = await prisma.user.create({
    data: {
      employeeId: 'EMP005',
      username: 'mua.hang',
      email: 'mua.hang@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Phạm',
      lastName: 'Thị Mua Hàng',
      fullName: 'Phạm Thị Mua Hàng',
      phone: '0905678901',
      role: 'PURCHASER',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const accountant = await prisma.user.create({
    data: {
      employeeId: 'EMP006',
      username: 'ke.toan',
      email: 'ke.toan@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Hoàng',
      lastName: 'Văn Kế Toán',
      fullName: 'Hoàng Văn Kế Toán',
      phone: '0906789012',
      role: 'ACCOUNTANT',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const auditor = await prisma.user.create({
    data: {
      employeeId: 'EMP007',
      username: 'kiem.toan',
      email: 'kiem.toan@quanlikho.vn',
      passwordHash: '$2a$10$placeholder_hash',
      firstName: 'Ngô',
      lastName: 'Thị Kiểm Toán',
      fullName: 'Ngô Thị Kiểm Toán',
      phone: '0907890123',
      role: 'AUDITOR',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
    },
  });

  console.log('✅ Created 7 users');

  // ============================================
  // CREATE WAREHOUSES
  // ============================================
  console.log('🏭 Creating warehouses...');

  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Kho Tổng Hà Nội',
      code: 'WH-HN-001',
      address: 'Số 123 Đường Nguyễn Trãi, Quận Thanh Xuân',
      city: 'Hà Nội',
      district: 'Thanh Xuân',
      phone: '024 1234 5678',
      email: 'kho.hanoi@quanlikho.vn',
      type: 'MAIN',
      capacity: 5000,
      isActive: true,
      managerId: warehouseManager.id,
      managerName: warehouseManager.fullName || undefined,
    },
  });

  const electronicsWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Kho Linh Kiện Điện Tử',
      code: 'WH-EL-001',
      address: 'Số 456 Đường Phạm Hùng, Quận Cầu Giấy',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      phone: '024 9876 5432',
      email: 'kho.electronics@quanlikho.vn',
      type: 'DISTRIBUTION',
      capacity: 2000,
      isActive: true,
      managerId: warehouseManager.id,
      managerName: warehouseManager.fullName || undefined,
    },
  });

  console.log('✅ Created 2 warehouses');

  // ============================================
  // CREATE SUPPLIERS (Electronics Focus)
  // ============================================
  console.log('🏢 Creating suppliers...');

  const DigiKey = await prisma.supplier.create({
    data: {
      code: 'SUP-DK-001',
      name: 'Digi-Key Electronics Vietnam',
      shortName: 'Digi-Key',
      address: 'Tầng 15, Tòa nhà Lotte, 54 Liễu Giai',
      city: 'Hà Nội',
      district: 'Ba Đình',
      phone: '024 1111 2222',
      email: 'sales@digikey.vn',
      website: 'https://www.digikey.vn',
      taxCode: '0101234567',
      rating: 'EXCELLENT',
      paymentTerms: 'Net 30',
      leadTimeDays: 7,
      minimumOrderValue: 500000,
      status: 'ACTIVE',
      totalOrders: 156,
      totalValue: 1250000000,
      lastOrderDate: new Date('2026-03-15'),
      contacts: {
        create: {
          name: 'Trần Minh Quân',
          position: 'Sales Manager',
          phone: '0912345678',
          email: 'quan.tm@digikey.vn',
          isPrimary: true,
        },
      },
      bankAccounts: {
        create: {
          bankName: 'Vietcombank',
          accountNumber: '1234567890',
          accountName: 'Digi-Key Electronics Vietnam',
          branch: 'Hội Sở',
        },
      },
    },
  });

  const Mouser = await prisma.supplier.create({
    data: {
      code: 'SUP-MO-001',
      name: 'Mouser Electronics Chi nhánh VN',
      shortName: 'Mouser',
      address: 'Tầng 20, Tòa nhà Bitexco, 2 Hải Triều',
      city: 'Hồ Chí Minh',
      district: 'Quận 1',
      phone: '028 2222 3333',
      email: 'vn@mouser.com',
      website: 'https://www.mouser.vn',
      taxCode: '0109876543',
      rating: 'VERY_GOOD',
      paymentTerms: 'Net 45',
      leadTimeDays: 10,
      minimumOrderValue: 1000000,
      status: 'ACTIVE',
      totalOrders: 89,
      totalValue: 890000000,
      lastOrderDate: new Date('2026-03-10'),
      contacts: {
        create: {
          name: 'Lê Hoàng Nam',
          position: 'Regional Sales',
          phone: '0934567890',
          email: 'nam.lh@mouser.com',
          isPrimary: true,
        },
      },
    },
  });

  const ThanhCong = await prisma.supplier.create({
    data: {
      code: 'SUP-TC-001',
      name: 'Công Ty TNHH Thành Công Electronics',
      shortName: 'Thành Công',
      address: 'Số 78 Đường Trần Phú, Quận Hà Đông',
      city: 'Hà Nội',
      district: 'Hà Đông',
      phone: '024 3333 4444',
      email: 'info@thanhcongelectronics.vn',
      taxCode: '0105678901',
      rating: 'GOOD',
      paymentTerms: 'Net 15',
      leadTimeDays: 3,
      minimumOrderValue: 200000,
      status: 'ACTIVE',
      totalOrders: 234,
      totalValue: 567000000,
      lastOrderDate: new Date('2026-03-20'),
    },
  });

  console.log('✅ Created 3 suppliers');

  // ============================================
  // CREATE PRODUCTS (Electronics Focus)
  // ============================================
  console.log('📦 Creating products...');

  // IC Chips
  const atmega328 = await prisma.product.create({
    data: {
      sku: 'IC-ATMEGA328P-PU',
      barcode: '8901234567890',
      name: 'IC Chip ATmega328P-PU 8-bit AVR',
      description: 'Vi xử lý 8-bit AVR với 32KB Flash, 2KB SRAM, 1KB EEPROM. Thường dùng trong Arduino Uno.',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 50,
      maxStock: 500,
      costPrice: 85000,
      sellingPrice: 120000,
      isESDSensitive: true,
      esdNote: '⚡ ESD SENSITIVE - Store in anti-static bag. Handle with ESD wrist strap only.',
      createdBy: admin.id,
    },
  });

  const stm32 = await prisma.product.create({
    data: {
      sku: 'IC-STM32F103C8T6',
      barcode: '8901234567891',
      name: 'IC Chip STM32F103C8T6 ARM Cortex-M3',
      description: 'MCU ARM Cortex-M3 32-bit, 72MHz, 64KB Flash, 20KB SRAM',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 30,
      maxStock: 300,
      costPrice: 125000,
      sellingPrice: 180000,
      isESDSensitive: true,
      esdNote: '⚡ ESD SENSITIVE - Handle with care',
      createdBy: admin.id,
    },
  });

  const esp32 = await prisma.product.create({
    data: {
      sku: 'IC-ESP32-WROOM-32E',
      barcode: '8901234567892',
      name: 'Module ESP32-WROOM-32E WiFi+Bluetooth',
      description: 'Module WiFi + Bluetooth dual-mode với chip ESP32, 4MB Flash',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 40,
      maxStock: 400,
      costPrice: 95000,
      sellingPrice: 135000,
      isESDSensitive: true,
      esdNote: '⚡ ESD SENSITIVE',
      createdBy: admin.id,
    },
  });

  // Capacitors
  const cap100uf = await prisma.product.create({
    data: {
      sku: 'CAP-100UF-25V',
      barcode: '8902345678901',
      name: 'Tụ điện 100µF 25V Electrolytic',
      description: 'Tụ hóa 100µF 25V, size 6.3x5.4mm, radial lead',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 200,
      maxStock: 5000,
      costPrice: 2500,
      sellingPrice: 5000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  const cap100nf = await prisma.product.create({
    data: {
      sku: 'CAP-100NF-50V',
      barcode: '8902345678902',
      name: 'Tụ gốm 100nF 50V X7R',
      description: 'Tụ gốm 100nF 50V, size 0805, X7R',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 500,
      maxStock: 10000,
      costPrice: 500,
      sellingPrice: 1000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  // Resistors
  const res10k = await prisma.product.create({
    data: {
      sku: 'RES-10K-0805',
      barcode: '8903456789012',
      name: 'Điện trở 10KΩ 0805 1%',
      description: 'Điện trở SMD 10KΩ 0805, 1%, 0.125W',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 1000,
      maxStock: 50000,
      costPrice: 200,
      sellingPrice: 500,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  // Connectors
  const usbC = await prisma.product.create({
    data: {
      sku: 'CONN-USB-C-24PIN',
      barcode: '8904567890123',
      name: 'Connector USB Type-C 24 Pin SMD',
      description: 'USB Type-C receptacle 24-pin, horizontal mount, SMD',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 100,
      maxStock: 1000,
      costPrice: 15000,
      sellingPrice: 25000,
      isESDSensitive: true,
      esdNote: '⚡ ESD SENSITIVE',
      createdBy: admin.id,
    },
  });

  // Power Supply
  const psu5v = await prisma.product.create({
    data: {
      sku: 'PSU-5V-3A',
      barcode: '8905678901234',
      name: 'Module Nguồn LM2596 DC-DC 5V 3A',
      description: 'Module step-down LM2596, input 7-40V, output 5V 3A',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 50,
      maxStock: 300,
      costPrice: 35000,
      sellingPrice: 55000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  // Displays
  const oled128x64 = await prisma.product.create({
    data: {
      sku: 'LCD-OLED-0.96-I2C',
      barcode: '8906789012345',
      name: 'Màn hình OLED 0.96 inch I2C 128x64',
      description: 'OLED display 0.96 inch, I2C interface, 128x64 pixels, SSD1306',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 30,
      maxStock: 200,
      costPrice: 65000,
      sellingPrice: 95000,
      isESDSensitive: true,
      esdNote: '⚡ Handle with care',
      createdBy: admin.id,
    },
  });

  // Sensors
  const dht22 = await prisma.product.create({
    data: {
      sku: 'SEN-DHT22',
      barcode: '8907890123456',
      name: 'Cảm biến DHT22 Temperature & Humidity',
      description: 'Cảm biến nhiệt độ và độ ẩm DHT22, accuracy ±0.5°C',
      category: 'ELECTRONICS',
      unit: 'PIECE',
      reorderPoint: 20,
      maxStock: 150,
      costPrice: 45000,
      sellingPrice: 75000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  // Tools
  const multimeter = await prisma.product.create({
    data: {
      sku: 'TOOL-MULTI-DT830D',
      barcode: '8908901234567',
      name: 'Đồng hồ vạn năng DT830D',
      description: 'Đồng hồ vạn năng số DT830D, 2000 counts',
      category: 'TOOLS',
      unit: 'PIECE',
      reorderPoint: 10,
      maxStock: 50,
      costPrice: 85000,
      sellingPrice: 150000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  const solderingIron = await prisma.product.create({
    data: {
      sku: 'TOOL-SOLDER-936D',
      barcode: '8908901234568',
      name: 'Máy hàn thiếc 936D 60W',
      description: 'Máy hàn thiếc 936D, 60W, temperature control',
      category: 'TOOLS',
      unit: 'PIECE',
      reorderPoint: 5,
      maxStock: 20,
      costPrice: 450000,
      sellingPrice: 680000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  // ESD Protection
  const esdMat = await prisma.product.create({
    data: {
      sku: 'ESD-MAT-60X60',
      barcode: '8909012345678',
      name: 'Thảm ESD chống tĩnh 60x60cm',
      description: 'Thảm mat chống tĩnh điện 60x60cm, 2 lớp, ground cord',
      category: 'TOOLS',
      unit: 'PIECE',
      reorderPoint: 5,
      maxStock: 30,
      costPrice: 250000,
      sellingPrice: 380000,
      isESDSensitive: false,
      createdBy: admin.id,
    },
  });

  console.log('✅ Created 13 products');

  // ============================================
  // CREATE SUPPLIER BARCODES (Electronics)
  // ============================================
  console.log('📋 Creating supplier barcodes...');

  await prisma.supplierBarcode.createMany({
    data: [
      { productId: atmega328.id, barcode: 'ATMEGA328P-PU', supplierId: DigiKey.id, supplierName: 'Digi-Key', isDefault: true },
      { productId: atmega328.id, barcode: '978-ATMEGA328P-PU', supplierId: Mouser.id, supplierName: 'Mouser' },
      { productId: stm32.id, barcode: 'STM32F103C8T6', supplierId: DigiKey.id, supplierName: 'Digi-Key', isDefault: true },
      { productId: esp32.id, barcode: 'ESP32-WROOM-32E', supplierId: DigiKey.id, supplierName: 'Digi-Key', isDefault: true },
      { productId: esp32.id, barcode: 'ESP32-WROOM-32', supplierId: Mouser.id, supplierName: 'Mouser' },
      { productId: cap100uf.id, barcode: '25PK100MEFC6.3X11', supplierId: DigiKey.id, supplierName: 'Digi-Key', isDefault: true },
      { productId: usbC.id, barcode: 'USB4085-GF', supplierId: DigiKey.id, supplierName: 'Digi-Key', isDefault: true },
      { productId: usbC.id, barcode: '630-FX06-2300110', supplierId: Mouser.id, supplierName: 'Mouser' },
    ],
  });

  console.log('✅ Created supplier barcodes');

  // ============================================
  // CREATE INVENTORY ITEMS
  // ============================================
  console.log('📊 Creating inventory items...');

  const inventoryItems = await Promise.all([
    // Electronics Warehouse
    prisma.inventoryItem.create({
      data: {
        productId: atmega328.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 150,
        quantityAvailable: 145,
        quantityReserved: 5,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: stm32.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S02',
        quantityTotal: 80,
        quantityAvailable: 78,
        quantityReserved: 2,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: esp32.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '01',
        locationRack: 'R02',
        locationShelf: 'S01',
        quantityTotal: 200,
        quantityAvailable: 195,
        quantityReserved: 5,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: cap100uf.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'B',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 3000,
        quantityAvailable: 2950,
        quantityReserved: 50,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: cap100nf.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'B',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S02',
        quantityTotal: 8000,
        quantityAvailable: 7950,
        quantityReserved: 50,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: res10k.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'B',
        locationAisle: '02',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 25000,
        quantityAvailable: 24800,
        quantityReserved: 200,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: usbC.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '02',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 45,
        quantityAvailable: 42,
        quantityReserved: 3,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: psu5v.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'C',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 120,
        quantityAvailable: 115,
        quantityReserved: 5,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: oled128x64.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '02',
        locationRack: 'R02',
        locationShelf: 'S01',
        quantityTotal: 60,
        quantityAvailable: 58,
        quantityReserved: 2,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: dht22.id,
        warehouseId: electronicsWarehouse.id,
        locationZone: 'A',
        locationAisle: '02',
        locationRack: 'R02',
        locationShelf: 'S02',
        quantityTotal: 35,
        quantityAvailable: 33,
        quantityReserved: 2,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    // Main Warehouse
    prisma.inventoryItem.create({
      data: {
        productId: multimeter.id,
        warehouseId: mainWarehouse.id,
        locationZone: 'D',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 25,
        quantityAvailable: 24,
        quantityReserved: 1,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: solderingIron.id,
        warehouseId: mainWarehouse.id,
        locationZone: 'D',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S02',
        quantityTotal: 8,
        quantityAvailable: 8,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        productId: esdMat.id,
        warehouseId: mainWarehouse.id,
        locationZone: 'E',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 15,
        quantityAvailable: 14,
        quantityReserved: 1,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
    // Low stock item
    prisma.inventoryItem.create({
      data: {
        productId: usbC.id,
        warehouseId: mainWarehouse.id,
        locationZone: 'A',
        locationAisle: '01',
        locationRack: 'R01',
        locationShelf: 'S01',
        quantityTotal: 8,
        quantityAvailable: 8,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      },
    }),
  ]);

  console.log('✅ Created inventory items');

  // ============================================
  // CREATE PURCHASE ORDERS
  // ============================================
  console.log('📝 Creating purchase orders...');

  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-00001',
      supplierId: DigiKey.id,
      subtotal: 10000000,
      taxAmount: 1000000,
      totalValue: 11000000,
      status: 'CONFIRMED',
      orderDate: new Date('2026-03-01'),
      expectedDeliveryDate: new Date('2026-03-15'),
      createdBy: purchaser.id,
      approvedBy: warehouseManager.id,
      approvedAt: new Date('2026-03-02'),
      items: {
        create: [
          { productId: atmega328.id, productSku: atmega328.sku, productName: atmega328.name, unit: 'PIECE', quantity: 100, unitPrice: 85000, totalPrice: 8500000, orderedQuantity: 100, receivedQuantity: 0, pendingQuantity: 100, deliveryStatus: 'PENDING' },
          { productId: stm32.id, productSku: stm32.sku, productName: stm32.name, unit: 'PIECE', quantity: 50, unitPrice: 125000, totalPrice: 6250000, orderedQuantity: 50, receivedQuantity: 0, pendingQuantity: 50, deliveryStatus: 'PENDING' },
          { productId: esp32.id, productSku: esp32.sku, productName: esp32.name, unit: 'PIECE', quantity: 100, unitPrice: 95000, totalPrice: 9500000, orderedQuantity: 100, receivedQuantity: 0, pendingQuantity: 100, deliveryStatus: 'PENDING' },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-00002',
      supplierId: Mouser.id,
      subtotal: 5000000,
      taxAmount: 500000,
      totalValue: 5500000,
      status: 'APPROVED',
      orderDate: new Date('2026-03-05'),
      expectedDeliveryDate: new Date('2026-03-20'),
      createdBy: purchaser.id,
      approvedBy: warehouseManager.id,
      approvedAt: new Date('2026-03-06'),
      items: {
        create: [
          { productId: usbC.id, productSku: usbC.sku, productName: usbC.name, unit: 'PIECE', quantity: 200, unitPrice: 15000, totalPrice: 3000000, orderedQuantity: 200, receivedQuantity: 0, pendingQuantity: 200, deliveryStatus: 'PENDING' },
          { productId: oled128x64.id, productSku: oled128x64.sku, productName: oled128x64.name, unit: 'PIECE', quantity: 100, unitPrice: 65000, totalPrice: 6500000, orderedQuantity: 100, receivedQuantity: 0, pendingQuantity: 100, deliveryStatus: 'PENDING' },
        ],
      },
    },
  });

  const po3 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-00003',
      supplierId: ThanhCong.id,
      subtotal: 2000000,
      taxAmount: 200000,
      totalValue: 2200000,
      status: 'FULLY_RECEIVED',
      orderDate: new Date('2026-02-15'),
      expectedDeliveryDate: new Date('2026-02-20'),
      actualDeliveryDate: new Date('2026-02-18'),
      createdBy: purchaser.id,
      approvedBy: warehouseManager.id,
      approvedAt: new Date('2026-02-16'),
      items: {
        create: [
          { productId: cap100uf.id, productSku: cap100uf.sku, productName: cap100uf.name, unit: 'PIECE', quantity: 1000, unitPrice: 2500, totalPrice: 2500000, orderedQuantity: 1000, receivedQuantity: 1000, pendingQuantity: 0, deliveryStatus: 'COMPLETE' },
          { productId: cap100nf.id, productSku: cap100nf.sku, productName: cap100nf.name, unit: 'PIECE', quantity: 2000, unitPrice: 500, totalPrice: 1000000, orderedQuantity: 2000, receivedQuantity: 2000, pendingQuantity: 0, deliveryStatus: 'COMPLETE' },
        ],
      },
    },
  });

  console.log('✅ Created 3 purchase orders');

  // ============================================
  // CREATE GOODS RECEIPTS
  // ============================================
  console.log('📥 Creating goods receipts...');

  const gr1 = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: 'GR-2026-00001',
      grnNumber: 'GRN-2026-00001',
      referenceType: 'po',
      referenceId: po3.id,
      referenceNumber: po3.orderNumber,
      supplierId: ThanhCong.id,
      subtotal: 3000000,
      taxAmount: 300000,
      totalValue: 3300000,
      status: 'COMPLETED',
      receiptDate: new Date('2026-02-18'),
      receivedBy: warehouseStaff1.id,
      inspectedBy: warehouseManager.id,
      inspectedAt: new Date('2026-02-18'),
      approvedBy: warehouseManager.id,
      approvedAt: new Date('2026-02-18'),
      warehouseId: electronicsWarehouse.id,
      notes: 'Nhập đủ số lượng theo PO',
      items: {
        create: [
          { productId: cap100uf.id, productSku: cap100uf.sku, productName: cap100uf.name, unit: 'PIECE', quantity: 1000, unitPrice: 2500, totalPrice: 2500000, receivedQuantity: 1000, acceptedQuantity: 1000, rejectedQuantity: 0, quarantineQuantity: 0, locationZone: 'B', locationAisle: '01', locationRack: 'R01', locationShelf: 'S01' },
          { productId: cap100nf.id, productSku: cap100nf.sku, productName: cap100nf.name, unit: 'PIECE', quantity: 2000, unitPrice: 500, totalPrice: 1000000, receivedQuantity: 2000, acceptedQuantity: 2000, rejectedQuantity: 0, quarantineQuantity: 0, locationZone: 'B', locationAisle: '01', locationRack: 'R01', locationShelf: 'S02' },
        ],
      },
    },
  });

  console.log('✅ Created 1 goods receipt');

  // ============================================
  // CREATE STOCKTAKE SESSION
  // ============================================
  console.log('📋 Creating stocktake sessions...');

  const stocktake1 = await prisma.stocktakeSession.create({
    data: {
      stocktakeNumber: 'STK-2026-00001',
      type: 'CYCLE',
      name: 'Kiểm kê tháng 3 - Khu A',
      description: 'Kiểm kê chu kỳ khu vực A - Linh kiện IC',
      warehouseId: electronicsWarehouse.id,
      zones: JSON.stringify(['A']),
      status: 'IN_PROGRESS',
      scheduledDate: new Date('2026-03-25'),
      startedDate: new Date('2026-03-25'),
      assignedTo: warehouseStaff1.id,
      totalProducts: 5,
      countedProducts: 2,
      totalDiscrepancies: 1,
      createdBy: warehouseManager.id,
      discrepancies: {
        create: [
          { productId: atmega328.id, productSku: atmega328.sku, productName: atmega328.name, unit: 'PIECE', warehouseId: electronicsWarehouse.id, locationZone: 'A', locationAisle: '01', locationRack: 'R01', locationShelf: 'S01', systemQuantity: 150, countedQuantity: 148, difference: -2, variancePercentage: -1.33, adjustmentStatus: 'PENDING' },
          { productId: stm32.id, productSku: stm32.sku, productName: stm32.name, unit: 'PIECE', warehouseId: electronicsWarehouse.id, locationZone: 'A', locationAisle: '01', locationRack: 'R01', locationShelf: 'S02', systemQuantity: 80, countedQuantity: 80, difference: 0, variancePercentage: 0, adjustmentStatus: 'PENDING' },
        ],
      },
    },
  });

  console.log('✅ Created 1 stocktake session');

  // ============================================
  // CREATE AUDIT LOGS
  // ============================================
  console.log('📜 Creating audit logs...');

  await prisma.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'PurchaseOrder', entityId: po1.id, entityName: po1.orderNumber, userId: purchaser.id, userName: purchaser.fullName || undefined, userEmail: purchaser.email, userRole: 'PURCHASER', timestamp: new Date('2026-03-01') },
      { action: 'APPROVE', entity: 'PurchaseOrder', entityId: po1.id, entityName: po1.orderNumber, userId: warehouseManager.id, userName: warehouseManager.fullName || undefined, userEmail: warehouseManager.email, userRole: 'WAREHOUSE_MANAGER', timestamp: new Date('2026-03-02') },
      { action: 'CREATE', entity: 'PurchaseOrder', entityId: po2.id, entityName: po2.orderNumber, userId: purchaser.id, userName: purchaser.fullName || undefined, userEmail: purchaser.email, userRole: 'PURCHASER', timestamp: new Date('2026-03-05') },
      { action: 'APPROVE', entity: 'PurchaseOrder', entityId: po2.id, entityName: po2.orderNumber, userId: warehouseManager.id, userName: warehouseManager.fullName || undefined, userEmail: warehouseManager.email, userRole: 'WAREHOUSE_MANAGER', timestamp: new Date('2026-03-06') },
      { action: 'GOODS_RECEIPT', entity: 'GoodsReceipt', entityId: gr1.id, entityName: gr1.receiptNumber, userId: warehouseStaff1.id, userName: warehouseStaff1.fullName || undefined, userEmail: warehouseStaff1.email, userRole: 'WAREHOUSE_STAFF', timestamp: new Date('2026-02-18') },
      { action: 'INVENTORY_UPDATE', entity: 'InventoryItem', entityId: inventoryItems[3].id, entityName: 'Tụ điện 100µF', userId: warehouseStaff1.id, userName: warehouseStaff1.fullName || undefined, userEmail: warehouseStaff1.email, userRole: 'WAREHOUSE_STAFF', timestamp: new Date('2026-02-18') },
    ],
  });

  console.log('✅ Created audit logs');

  // ============================================
  // CREATE ALERTS
  // ============================================
  console.log('⚠️ Creating alerts...');

  await prisma.inventoryAlert.createMany({
    data: [
      {
        type: 'LOW_STOCK',
        severity: 'WARNING',
        productId: usbC.id,
        productSku: usbC.sku,
        productName: usbC.name,
        warehouseId: electronicsWarehouse.id,
        warehouseName: electronicsWarehouse.name,
        message: `Connector USB Type-C 24 Pin SMD (${usbC.sku}) sắp hết hàng tại Kho Linh Kiện Điện Tử. Tồn kho: 45, Mức tối thiểu: 100`,
        currentQuantity: 45,
        reorderPoint: 100,
        isRead: false,
      },
      {
        type: 'LOW_STOCK',
        severity: 'WARNING',
        productId: usbC.id,
        productSku: usbC.sku,
        productName: usbC.name,
        warehouseId: mainWarehouse.id,
        warehouseName: mainWarehouse.name,
        message: `Connector USB Type-C 24 Pin SMD (${usbC.sku}) sắp hết hàng tại Kho Tổng Hà Nội. Tồn kho: 8, Mức tối thiểu: 100`,
        currentQuantity: 8,
        reorderPoint: 100,
        isRead: false,
      },
    ],
  });

  console.log('✅ Created alerts');

  // ============================================
  // COMPLETE
  // ============================================
  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log('  - Users: 7');
  console.log('  - Warehouses: 2');
  console.log('  - Suppliers: 3');
  console.log('  - Products: 13');
  console.log('  - Inventory Items: 14');
  console.log('  - Purchase Orders: 3');
  console.log('  - Goods Receipts: 1');
  console.log('  - Stocktake Sessions: 1');
  console.log('  - Audit Logs: 6');
  console.log('  - Alerts: 2');
  console.log('');
  console.log('Login credentials (demo):');
  console.log('  - Admin: admin / any password');
  console.log('  - Manager: kho.truong / any password');
  console.log('  - Staff: kho.nhanvien1 / any password');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
