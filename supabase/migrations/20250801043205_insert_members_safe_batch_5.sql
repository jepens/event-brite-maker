-- Insert member data batch 5 (records 811-1010)
-- Using ON CONFLICT DO NOTHING to avoid duplicate key errors
-- Table structure: id, member_number (NOT NULL), full_name (NOT NULL), created_at, updated_at, sequence_number
INSERT INTO public.members (member_number, full_name, sequence_number) VALUES
('2016000307', 'Soehartanto', 811),
('2016000471', 'Riska Afriani', 812),
('2016000445', 'Rossaly Rosy', 813),
('2016000556', 'Mirhan', 814),
('2016000579', 'Rusdi Oesman', 815),
('2016000580', 'Ratna Puspitasari', 816),
('2016000591', 'Firda Wahyuni Nasution', 817),
('2016000596', 'R. Budi Ginanjar SE, AK', 818),
('2016000600', 'Yusuf Ade Winoto', 819),
('2016000609', 'Hendra Wijaya Harahap', 820),
('2016000632', 'Wahyudityo Ramadhanny', 821),
('2016000640', 'Mercy Fajarina', 822),
('2016000652', 'Susi Silvana', 823),
('2016000663', 'Ria Meristika Warganda', 824),
('2016000698', 'Joko Sutrisno', 825),
('2016000714', 'Ignatius Philip', 826),
('2016000732', 'Danica Adhitama', 827),
('2016000754', 'Fatiha Wahyudi', 828),
('2016000786', 'Elisa Yoshigoe Wijaya', 829),
('2016000797', 'Andy Chandra', 830),
('2016000803', 'Arief Fahruri', 831),
('2016000810', 'Yoni Bambang Oetoro', 832),
('2016000822', 'Dastin Mirjaya Mudijana', 833),
('2016000824', 'Josephin', 834),
('2016000844', 'Arief Cahyadi Wana', 835),
('2016000853', 'Gunawan Tjandra', 836),
('2016000856', 'Putu Wahyu Suryawan', 837),
('2016000917', 'Demetrius Ari Pitojo', 838),
('2016000498', 'H. ISMADY MAIDIR, SE. MM', 839),
('2016000841', 'Mahadi Gani', 840),
('2016000848', 'Didit Ali Perdana', 841),
('2016000851', 'Billy Budiman', 842),
('2016000825', 'RD. Zamzam Reza', 843),
('2016000435', 'Muhammad Reza', 844),
('2016000493', 'Rudolfus Pribadi Agung Sujagad', 845),
('2016000690', 'Irsanto aditia', 846),
('2016000910', 'Lukman Gunawan', 847),
('2016000935', 'Prof.Dr. MS Tumonggor, SH, M.si', 848),
('2016000907', 'Bambang Rahardja Burhan', 849),
('2016000858', 'Suhardi Tanujaya', 850),
('2016000859', 'Tri Meryta', 851),
('2016000860', 'Anthony', 852),
('2016000861', 'Arfianto Nugroho Pudjadi', 853),
('2016000862', 'Immanuel Santoso', 854),
('2016000863', 'Yuanita Mahayekti Hutami', 855),
('2016000864', 'Danny Patria', 856),
('2016000865', 'Hendy Oktinal', 857),
('2016000866', 'Henry Manurung', 858),
('2016000868', 'Pandapotan Tua Albert P', 859),
('2016000869', 'Syamsul Huda', 860),
('2016000870', 'Akuntino Mandhany', 861),
('2016000871', 'Sandhika Maulana', 862),
('2016000872', 'Else Fernanda', 863),
('2016000873', 'Juni Soesilowati', 864),
('2016000874', 'Noviana Soesanty', 865),
('2016000875', 'Tri Agung Winantoro, SE', 866),
('2016000876', 'Wisnuaji Wibowo', 867),
('2016000878', 'Didi Kurniawan', 868),
('2016000880', 'Njoman Sudartha', 869),
('2016000881', 'Rina Novita Sari', 870),
('2016000882', 'Anna', 871),
('2016000883', 'Sonny Anugrah Akbar', 872),
('2016000884', 'Ari Santosa', 873),
('2016000885', 'Widya Meidrianto', 874),
('2016000886', 'Rizki Ardhi', 875),
('2016000887', 'Hendra Irawan', 876),
('2016000888', 'Rosidin', 877),
('2016000889', 'Abdullah Umar', 878),
('2016000890', 'Rini Winati', 879),
('2016000891', 'Teddy Sunandar', 880),
('2016000892', 'Rudy Johansen', 881),
('2016000894', 'Nova Chandra', 882),
('2016000895', 'Andre Varian', 883),
('2016000896', 'Harris Sorimuda Dalimunthe', 884),
('2016000898', 'Yoga Prakasa', 885),
('2016000899', 'Dwi Kristiani BD', 886),
('2016000900', 'Dyan Danisworo', 887),
('2016000901', 'Amrizal', 888),
('2016000903', 'Yuni Kusumawati', 889),
('2016000904', 'Ahmad Subagja', 890),
('2016000905', 'Ivan Hendra Likumahua, SE', 891),
('2016000906', 'Yunita Darmawan', 892),
('2016000911', 'Sudeswanto', 893),
('2016000912', 'Niken Juwita', 894),
('2016000913', 'Ferdyansyah Putra', 895),
('2016000914', 'Mahmud', 896),
('2016000915', 'Yulia Sulistyowati', 897),
('2021002762', 'Agus Pramono', 898),
('2016000918', 'Flabianus Andreanto', 899),
('2016000919', 'Riki Frindos', 900),
('2016000920', 'Rio Rinaldo Mulia', 901),
('2016000922', 'Valentina Widyastuti', 902),
('2016000923', 'Vishnupuram Subramanian Premanand', 903),
('2016000927', 'Yanuar Pribadi', 904),
('2016000928', 'Ahmad Qohar Syakir', 905),
('2016000929', 'Heri Wahyu Setiyarso', 906),
('2016000930', 'Mariah', 907),
('2016000931', 'Erwinsdy Ginting SE Msc', 908),
('2016000932', 'Rahmat Sugiono Halim', 909),
('2016000934', 'Deddy Suganda Widjaja', 910),
('2016000936', 'Shirley', 911),
('2016000937', 'M. Batara H.J.M.H.P', 912),
('2016000938', 'Aditya Surya Akbar', 913),
('2016000939', 'Ferro Budhimeilano', 914),
('2016000940', 'Linda Ryana', 915),
('2016000941', 'Oktavia H.Eliasta Pohan', 916),
('2016000942', 'Ramot Arifin Gunawan Sihombing', 917),
('2016000943', 'Ronald Abednego Sebayang', 918),
('2016000944', 'Sutjipto J.Hugeng', 919),
('2016000945', 'Yudi Hardy Hermawan', 920),
('2016000946', 'Wahyu Indrawan', 921),
('2016000948', 'Teddy Atmadja', 922),
('2016000949', 'Ade Putra', 923),
('2016000950', 'Anita Wijaya, SE.', 924),
('2016000951', 'Anwar Halim', 925),
('2016000952', 'Eko Panunggal Gunara', 926),
('2016000953', 'RR Grace Nurhandayani', 927),
('2016000954', 'Indera', 928),
('2016000955', 'R Roni Gursala', 929),
('2016000956', 'Rosiana Eko Agustina', 930),
('2016000957', 'Febby Stephanie', 931),
('2016000958', 'Aditya Budi Kurniawan', 932),
('2016000959', 'Benny Haryanto Djie', 933),
('2016000960', 'Emir Hario Utomo', 934),
('2016000961', 'Freddy Hendradjaja', 935),
('2016000962', 'Garry Prabu P. Siregar', 936),
('2016000963', 'Honny Kandany', 937),
('2016000964', 'Muliawan Sutanto', 938),
('2016000965', 'Peter Indra Lembong', 939),
('2016000966', 'Hapto Stato', 940),
('2016000967', 'Nene Harmulyo', 941),
('2016000969', 'Yekti Dewanti', 942),
('2016000970', 'Zulfa Hendri', 943),
('2016000973', 'Abiprayadi Riyanto', 944),
('2016000974', 'Hendra Gunawan', 945),
('2016000975', 'Astrid Roselina L. Toruan', 946),
('2016000976', 'Bambang Wasono', 947),
('2016000978', 'Aryacipta Subandrio', 948),
('2016000979', 'Fordyanto Widjaja', 949),
('2016000980', 'Alex Prawira Ujuan P', 950),
('2016000981', 'Danny Eugene Diepenhorst', 951),
('2016000982', 'Fajar Heru Swasono', 952),
('2016000983', 'Hendry Kuswari', 953),
('2016000984', 'Muhammad Syamsi', 954),
('2016000985', 'Sudaryanto', 955),
('2016000986', 'Triandhy Nur', 956),
('2016000987', 'Ario W Adhikari', 957),
('2016000989', 'Edhie Setiyo Pramono', 958),
('2016000990', 'Fahyudi Djaniatmadja', 959),
('2016000991', 'Ferina Tanzil', 960),
('2016000992', 'Nasul Haris', 961),
('2016000993', 'Toni Sutono Hadimulyo', 962),
('2016000994', 'Beba Hawah Ria', 963),
('2016000995', 'Budi Wihartanto', 964),
('2016000996', 'Djajadi', 965),
('2016000997', 'Fadli', 966),
('2016000998', 'Rachmad', 967),
('2016000999', 'Rudi Yulianto Limuria', 968),
('2016001000', 'Thio Devy Therly', 969),
('2016001001', 'Angky Aganipurwanto', 970),
('2016001002', 'Dian Kemala Inezwari', 971),
('2016001003', 'Kushindrarto', 972),
('2016001004', 'Kurniawan Sulaiman', 973),
('2016001005', 'Yenny', 974),
('2016001006', 'Regina Friandita Tan', 975),
('2016001007', 'Andy Tjiayadi', 976),
('2016001008', 'Soemarijadi', 977),
('2016001009', 'Lodevik Ludo Kartawijaya', 978),
('2016001011', 'Tifany', 979),
('2016001012', 'Walman Harianto P. Hutagaol', 980),
('2016001013', 'Yacob Enoch', 981),
('2016001014', 'Darmin', 982),
('2016001016', 'Putu Yani Arini', 983),
('2016001017', 'Albertus Arifani H.S', 984),
('2016001018', 'Hendryarto Sanchia', 985),
('2016001020', 'Stefanus Christmas P', 986),
('2016001021', 'Adianto Indradi', 987),
('2016001022', 'David M. Gormley', 988),
('2016001023', 'Edy Darwan Saragih', 989),
('2016001024', 'Rully J.Anwar', 990),
('2016001025', 'Achfas Achsien', 991),
('2016001026', 'Edi Basuki', 992),
('2016001027', 'Edwin', 993),
('2016001028', 'Endrat Nur Wibowo', 994),
('2016001029', 'San Verandy Herveranto Kusuma', 995),
('2016001030', 'Tio Geraldo Hutabarat', 996),
('2016001031', 'Yulian Kusuma Kwee', 997),
('2016001032', 'Mentor B.Simanjuntak', 998),
('2016001033', 'Franky Wijono', 999),
('2016001034', 'Joo Mike Purnama Sari', 1000),
('2016001035', 'Andri Yauhari Njauw', 1001),
('2016001036', 'Guntur Surya Putra', 1002),
('2016001037', 'Indra Muharam Firmansyah', 1003),
('2016001038', 'Joseph Andreas', 1004),
('2016001039', 'Nelson Tjewongso', 1005),
('2016001040', 'Fifin Firdaus', 1006),
('2016001041', 'Iwan Margana', 1007),
('2016001044', 'Mufri Dharmawan', 1008),
('2016001045', 'Gita Aji Adiwoso', 1009),
('2016001046', 'Devara Atma Hudoyo', 1010)
ON CONFLICT (member_number) DO NOTHING;
