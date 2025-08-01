-- Insert member data batch 6 (records 1011-1210)
-- Using ON CONFLICT DO NOTHING to avoid duplicate key errors
-- Table structure: id, member_number (NOT NULL), full_name (NOT NULL), created_at, updated_at, sequence_number
INSERT INTO public.members (member_number, full_name, sequence_number) VALUES
('2016001047', 'Harjono Budiharsana', 1011),
('2016001048', 'Sandrawati Halim', 1012),
('2016001050', 'Christian Perina Halim', 1013),
('2016001051', 'David H Manurung SE MM', 1014),
('2016001052', 'Mandidang Bangun Siahaan', 1015),
('2022003087', 'Edward Narodo', 1016),
('2016001055', 'Agung Ramadoni', 1017),
('2016001056', 'Agus Basuki Yanuar', 1018),
('2016001057', 'Anang Roso', 1019),
('2016001058', 'Ari Muhammad Rizal, SE', 1020),
('2016001059', 'Ayu Widuri', 1021),
('2016001061', 'Budi Santoso', 1022),
('2016001062', 'Dimas Noverio', 1023),
('2016001063', 'Evelyn Satyono', 1024),
('2016001064', 'Gema Kumara Darmawan', 1025),
('2016001065', 'Herbie Perdana Mohede', 1026),
('2016001066', 'I Nyoman Widyarsa Murti', 1027),
('2016001067', 'H Intansyah Ichsan', 1028),
('2016001068', 'Lana Sulistyaningsih', 1029),
('2016001070', 'Rakesh Jain', 1030),
('2016001071', 'Ramadhan Putera Djaffri', 1031),
('2016001072', 'Ramos Impola', 1032),
('2016001073', 'Simon Robertus Y. A.', 1033),
('2016001074', 'Sisilia Dhone', 1034),
('2016001075', 'Dewi Aviany', 1035),
('2016001076', 'Munawaroh', 1036),
('2016001077', 'Andreas Hendi Purwadi', 1037),
('2016001078', 'Frenky Loa', 1038),
('2016001080', 'David Cornelis Mokalu', 1039),
('2016001081', 'Gideon Michael Lapian', 1040),
('2016001082', 'Nita Khaizu', 1041),
('2016001083', 'Hasbie Sukaton, SE', 1042),
('2016001084', 'Horas Sebastian E Tobing', 1043),
('2016001087', 'Jefri Bundo', 1044),
('2016001088', 'Idrus', 1045),
('2016001089', 'Willy Kusmadi', 1046),
('2016001090', 'Djoko Koostanto', 1047),
('2016001054', 'Francisca Indriati', 1048),
('2016000968', 'Punike Pirantya', 1049),
('2016000971', 'Priyo Santoso', 1050),
('2016001079', 'Lanang Trihardian', 1051),
('2016000909', 'Iwan Triadji', 1052),
('2017001098', 'Mohammad Ega Sudrajat', 1053),
('2017001091', 'Aga Nugraha', 1054),
('2017001092', 'Adhe Mustofa', 1055),
('2017001093', 'Prakosa Andiantyo', 1056),
('2017001096', 'Wawan Hermawan, SE', 1057),
('2017001097', 'Drs. Hariadi Tjahjono', 1058),
('2017001095', 'Endang Windu Andriastuty', 1059),
('2017001099', 'Dwi Yantik Sriwulan', 1060),
('2017001100', 'Verdianto Prakoso', 1061),
('2017001101', 'NUR FALAH', 1062),
('2017001102', 'Agra Pramudita', 1063),
('2017001104', 'Aaron Devara A', 1064),
('2017001105', 'Susanto Halim', 1065),
('2017001106', 'Ernest Jose', 1066),
('2017001107', 'Hans Mulyadi Irawan', 1067),
('2017001108', 'Tjiong Toni', 1068),
('2017001109', 'Chaerul Ichwan Nur, SE', 1069),
('2017001110', 'Ankga Adiwirasta', 1070),
('2017001111', 'Dwiyani Andar Cahyani', 1071),
('2017001112', 'Lucky Lesmana', 1072),
('2017001113', 'Raden Novianti, , SE', 1073),
('2017001114', 'Tri Untara, SE, MM', 1074),
('2017001115', 'Maria Wangsalegawa', 1075),
('2017001116', 'Michael Dickension', 1076),
('2017001117', 'Dodi Nugroho', 1077),
('2017001118', 'Fadjar Eko Rizkijanto', 1078),
('2017001119', 'Marina Prisca Kendarto', 1079),
('2017001120', 'Meiti Sulistika', 1080),
('2017001121', 'Fajar Rudityo', 1081),
('2017001122', 'Lerry Big Senjaya', 1082),
('2017001124', 'Mariani', 1083),
('2017001125', 'Roy Kristiawan', 1084),
('2017001126', 'Eliza Anastasia', 1085),
('2018001895', 'Hadi Widjaja Purnomo', 1086),
('2017001128', 'Alwin Rusli', 1087),
('2017001129', 'Pieter Djatmiko', 1088),
('2017001130', 'Alfaruqi Abizar', 1089),
('2017001131', 'Rizky Arvidillah', 1090),
('2017001132', 'Rakhmi Wijiharti', 1091),
('2017001133', 'Dewinta Aprillia Utami', 1092),
('2017001134', 'Andreas Satya Pratama Kurniawan', 1093),
('2017001135', 'Jemmy Paul Wawointana', 1094),
('2017001136', 'Nico Yosman', 1095),
('2017001137', 'Michele Gabriela', 1096),
('2017001138', 'Sri Lestari Werdiningsih', 1097),
('2017001139', 'Yenny Siahaan', 1098),
('2017001140', 'A Iskandar Salim', 1099),
('2017001141', 'Shabrina Puspa Atika', 1100),
('2017001142', 'Astrid Vitriana Dasuki', 1101),
('2017001143', 'R.B. Hasanuddin', 1102),
('2017001144', 'Shan Aristio Dongoran', 1103),
('2017001145', 'Tomy Zulfikar', 1104),
('2017001146', 'Glenn Gregorius', 1105),
('2017001147', 'Pandu Anugrah', 1106),
('2017001148', 'Ariantono Eko Darmawan', 1107),
('2017001149', 'Charlie Martin', 1108),
('2023003322', 'Relix A.N. Rocky', 1109),
('2017001151', 'Ary Utama Iswardi', 1110),
('2017001152', 'Ian Reyhan', 1111),
('2017001153', 'Setiarto', 1112),
('2017001154', 'Toroziduhu Kristian N', 1113),
('2017001155', 'Eunice M. Satyono', 1114),
('2017001156', 'Felicia Moningkai', 1115),
('2017001157', 'Aradian Sefta', 1116),
('2017001158', 'Dasrul', 1117),
('2017001159', 'Linda Merliana, SE', 1118),
('2017001160', 'Tandy Cahyadi', 1119),
('2017001161', 'Diah Pusparini', 1120),
('2017001162', 'Ajeng Pratiwi', 1121),
('2017001163', 'Felicia Francisca', 1122),
('2017001164', 'Handayani', 1123),
('2017001165', 'yusep sidik faziri', 1124),
('2017001166', 'Ida Bagus Putu Sinarbawa', 1125),
('2017001167', 'Emri Wirawan', 1126),
('2017001168', 'Steven Satya Yudha', 1127),
('2017001169', 'Rahmi Sari Marina', 1128),
('2017001170', 'Anton Surya Djojo', 1129),
('2017001171', 'Ernie Widyastuti', 1130),
('2017001172', 'Gilang Triadi', 1131),
('2017001173', 'Arie Harmansyah', 1132),
('2017001174', 'Ir. Justarina S.M Naiborhu', 1133),
('2017001175', 'Lelly Susmiati', 1134),
('2017001176', 'Adinda Anggriadipta', 1135),
('2017001178', 'Heru Irvansyah', 1136),
('2017001179', 'Upik Susiyawati', 1137),
('2017001180', 'Chandra', 1138),
('2017001181', 'Eni Murlini', 1139),
('2017001182', 'Fransiska Krissetyati Widianingsih', 1140),
('2017001183', 'Aldrich Anthonio', 1141),
('2017001184', 'Yoko Liejaya', 1142),
('2017001185', 'Evilia Kurniawati Prayogo', 1143),
('2017001186', 'Sujasmin P Manik', 1144),
('2017001187', 'Yuniar Ahmadani', 1145),
('2017001188', 'Meliani Silvianti.SE', 1146),
('2017001189', 'HARIYANTO TIRTAJAYA', 1147),
('2017001190', 'Adi Saputra', 1148),
('2017001191', 'Adrian Roza', 1149),
('2017001192', 'Marsha Halim', 1150),
('2017001193', 'Deddy Irawan', 1151),
('2017001194', 'GILLANG PANJIWIJAYA', 1152),
('2017001195', 'JULIS RIKEN', 1153),
('2017001196', 'Diana', 1154),
('2017001197', 'Wahyu Nando Wijaya', 1155),
('2017001198', 'Achmad Rivai Nursyamsi Syahdin', 1156),
('2017001199', 'Ricky Samsico', 1157),
('2017001200', 'Safari Anam', 1158),
('2017001201', 'Rio Marthin Simorangkir', 1159),
('2017001202', 'Randy Muhammad Djamal', 1160),
('2017001203', 'Ario Wibowo', 1161),
('2017001204', 'Berry Edhwina Pribadi', 1162),
('2017001205', 'Hendrayani Suryaningsih', 1163),
('2017001206', 'Anthony Yunus', 1164),
('2017001207', 'WISNU WARDHANA', 1165),
('2017001208', 'Olivia Savitri Widjaja', 1166),
('2017001209', 'Vicky Lazuardi', 1167),
('2017001210', 'Stevanus Eric Bastian Bolang', 1168),
('2017001211', 'KRISNA JOHAN', 1169),
('2017001212', 'Amandalia Johanes', 1170),
('2017001213', 'Emanuella Clarissa', 1171),
('2017001214', 'Adhi Sudargo Tasmin', 1172),
('2017001215', 'Eti Herawati', 1173),
('2017001216', 'Siti Syarifah Nuraeni', 1174),
('2017001217', 'I Gusti Ngurah Budi Kuncara', 1175),
('2017001218', 'GITA RAHAYU HADIYANTI', 1176),
('2017001219', 'BOEDI OENTARJO', 1177),
('2017001220', 'HANDI PUTRANTO WILAMARTA', 1178),
('2017001221', 'Ir Tria Indrasari', 1179),
('2017001222', 'MOUAMMARI FEBRY SHARIATI', 1180),
('2017001223', 'Suwanto Husin', 1181),
('2017001224', 'NUNING NURSITA', 1182),
('2017001225', 'JAMES ENOCH', 1183),
('2017001226', 'MUNAWAROH', 1184),
('2017001227', 'Novrizal Fauzi', 1185),
('2017001228', 'Puguh Wicaksono', 1186),
('2017001229', 'Mirza Rhaditya', 1187),
('2017001230', 'Filbert Chandra', 1188),
('2017001231', 'Fitri Lindawati', 1189),
('2017001232', 'Alan J. Tangkas Darmawan', 1190),
('2017001233', 'Irenha Aldilah', 1191),
('2017001234', 'Henry F.S. Lambe', 1192),
('2017001235', 'ASTI RANIASARI', 1193),
('2017001236', 'Anna Hariyana S.A', 1194),
('2017001237', 'Wenda Rusli', 1195),
('2017001238', 'Raden Ari Priyadi', 1196),
('2017001239', 'Santy', 1197),
('2017001240', 'Wito Mailoa', 1198),
('2017001241', 'Novitia Antiki', 1199),
('2017001242', 'Denny', 1200),
('2017001243', 'Hengky Djojosantoso, ST', 1201),
('2017001244', 'Yefta E Djunarjanto', 1202),
('2017001245', 'Christiana Purnama Wati S.', 1203),
('2017001246', 'ADHARA GUSDIANTO', 1204),
('2017001247', 'Rudy Fenji', 1205),
('2017001248', 'Andhika Pribadi', 1206),
('2017001249', 'Anita Eka Cahyani', 1207),
('2017001250', 'Wina Meiry Yanthie', 1208),
('2017001252', 'Abdul Rahman', 1209),
('2017001253', 'Reha Mauren Edralintus', 1210)
ON CONFLICT (member_number) DO NOTHING;
