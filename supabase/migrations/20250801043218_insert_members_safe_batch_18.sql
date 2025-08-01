-- Insert member data batch 18 (records 3411-3467)
-- Using ON CONFLICT DO NOTHING to avoid duplicate key errors
-- Table structure: id, member_number (NOT NULL), full_name (NOT NULL), created_at, updated_at, sequence_number
INSERT INTO public.members (member_number, full_name, sequence_number) VALUES
('2025003677', 'Darcyando Geodewa', 3411),
('2025003672', 'Mila Luvita', 3412),
('2025003742', 'Dwi Kurnia Setiawan', 3413),
('2025003756', 'Dira Ayu Pratiwi', 3414),
('2025003705', 'RIFDAH ADILIA', 3415),
('2025003704', 'PUTRI NOVIA FRANSISCA', 3416),
('2025003676', 'DRG. Handayani', 3417),
('2025003680', 'ANTONIUS SUPRIYANTO', 3418),
('2025003682', 'Dian Pamuji', 3419),
('2025003693', 'Jejei Kurnia', 3420),
('2025003710', 'Muhammad Nurkholis Syafruddin', 3421),
('2025003699', 'Kelly Claudya Cristopher', 3422),
('2025003686', 'Ziyanur Rahman Az Zahrawi', 3423),
('2025003683', 'Maria Franda Desiandry Dien', 3424),
('2025003715', 'Pramudia Widaryanto', 3425),
('2025003702', 'Lusiana Permatasari', 3426),
('2025003709', 'Moses Gunarto Susiadi,SSI,MM', 3427),
('2025003713', 'Finni Hana Prilanti', 3428),
('2025003720', 'BAGUS PUTRA MAHARDHIKA', 3429),
('2025003700', 'Wahyu Tri Rahmanto', 3430),
('2025003714', 'MUHAMMAD NAUVAL', 3431),
('2025003707', 'Chairi Pitono', 3432),
('2025003716', 'Khotimah', 3433),
('2025003703', 'BUDI SUTRISNO', 3434),
('2025003722', 'Edwind Kustiawan', 3435),
('2025003765', 'Andrian Alamsyah Saputra', 3436),
('2025003726', 'Melliza Nastasia Izazi', 3437),
('2025003717', 'Nengah Rama Gautama', 3438),
('2025003723', 'Yogi Utomo', 3439),
('2025003724', 'Indra Yulia', 3440),
('2025003759', 'IKHFAN BUDIARTO', 3441),
('2025003735', 'REKA DEA MAOLI', 3442),
('2025003733', 'Moch Yudha Ramadhan', 3443),
('2025003730', 'Eko Rachman Nursaleh', 3444),
('2025003734', 'Fajar Firmansyah', 3445),
('2025003748', 'Raden Indra Pratama', 3446),
('2025003736', 'RISWANDA KURNIAWAN', 3447),
('2025003753', 'Patricia Tiombun S P SE', 3448),
('2025003751', 'PHATAS WINDYANANTA', 3449),
('2025003777', 'Fajar Dwi Alfian', 3450),
('2025003741', 'Isfan Ferli', 3451),
('2025003737', 'Etriya', 3452),
('2025003767', 'MOHAMMER REHAN AL SHIDIQ', 3453),
('2025003760', 'Yasmina Lestari', 3454),
('2025003746', 'Safira Fitri Maani', 3455),
('2025003747', 'Velyna Gianalda', 3456),
('2025003774', 'Diaz Clements Binsar Purba', 3457),
('2025003752', 'Ayu Dian Fauzia', 3458),
('2025003770', 'Muhammad Rafly Abiyyi Nugroho', 3459),
('2025003750', 'Betty Kartini Sormin, SH', 3460),
('2025003764', 'Jihad', 3461),
('2025003763', 'Nicco Supriyatna', 3462),
('2025003755', 'Fabian Nabila Qanitra Bya', 3463),
('2025003758', 'ANTHONIUS EDYSON', 3464),
('2025003761', 'Kevin P. R. Dalame', 3465),
('2025003772', 'Fahressi Fahalmesta', 3466),
('2025003776', 'Jayeng Raja', 3467)
ON CONFLICT (member_number) DO NOTHING;
