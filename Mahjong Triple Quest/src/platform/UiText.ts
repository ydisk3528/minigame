export type UiLanguage = "" | "en" | "id" | "th" | "ja" | "fr";

let currentLanguage: UiLanguage = "";

const ZH: Record<string, string> = {
    "Mahjong Triple Quest": "麻将三消奇旅",
    "MAHJONG": "麻将", "TRIPLE QUEST": "三消奇旅", "PICK · SLOT · MATCH": "选牌 · 入槽 · 消除",
    "PLAY": "开始游戏", "SETTINGS": "设置", "SHOP": "商店", "DAILY": "签到", "SHARE": "分享",
    "TASKS": "任务", "CHALLENGE": "每日挑战", "THEMES": "主题", "DECOR": "装饰",
    "LEVEL": "关卡", "COINS": "金币", "OWNED": "拥有", "CLAIM": "领取", "WATCH AD · GET": "看广告领取",
    "DAY": "第", "COMPLETE": "天已完成", "COMBO": "连消",
    "CLEAR EVERY MAHJONG STACK": "消除所有麻将牌", "SELECT LEVEL": "选择关卡",
    "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "通关后解锁下一关", "SCORE": "得分",
    "TIME": "时间", "MOVES": "步数", "TIME UP": "时间结束", "OUT OF MOVES": "步数用完",
    "UNDO": "撤回", "SHUFFLE": "洗牌", "MOVE OUT": "移出", "HINT": "提示",
    "CURRENT": "当前", "COMPLETED": "已完成", "LOCKED": "未解锁",
    "LEVEL COMPLETE": "闯关成功", "NO SPACE": "槽位已满", "NEXT LEVEL": "下一关",
    "RESTART": "重新开始", "LEVEL SELECT": "选择关卡", "NO MORE CONTINUES": "已无复活机会",
    "WATCH AD · CONTINUE": "看广告继续", "CLOSE": "关闭", "MUSIC AND SOUND": "音乐与音效",
    "WATCH AD · +2 MOVES": "看广告恢复 2 步", "WATCH AD · +30 SECONDS": "看广告恢复 30 秒",
    "MUSIC: ON": "音乐：开", "MUSIC: OFF": "音乐：关", "SOUND: ON": "音效：开", "SOUND: OFF": "音效：关",
    "DAILY REWARD": "每日签到", "WATCH AN AD FOR 2X": "看广告奖励翻倍",
    "YOUR DAILY COINS ARE READY": "今日金币可以领取", "COMING SOON": "敬请期待", "GOT IT": "知道了",
    "CLAIMED TODAY": "今日已领取", "COME BACK TOMORROW": "明天再来吧", "PLAYING REWARDED AD...": "正在播放广告…",
    "WATCH THE FULL AD TO GET 2X": "看完广告即可获得双倍奖励", "NOT ENOUGH COINS": "金币不足",
    "SPECIAL DRAGONS": "中发白消除", "SEQUENCE": "顺子消除", "MATCH 3": "三张消除", "FREE PROP +1": "免费道具 +1",
    "NO SPACE. TRY AGAIN": "槽位已满，请重试", "LOADING REWARDED AD...": "正在加载广告…",
    "TIME UP. TRY AGAIN": "时间已结束，请重试", "OUT OF MOVES. TRY AGAIN": "步数已用完，请重试",
    "AD NOT AVAILABLE. TRY AGAIN": "广告暂不可用，请重试", "CONTINUE": "继续游戏",
    "TAP A FREE TILE": "点击未被遮挡的牌", "TAP TWO MORE MATCHING TILES": "再点击两张相同的牌",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "三张相同的牌会自动消除", "MATCH COMPLETE! ONLY 7 SLOTS": "消除成功！槽位只有 7 个",
    "UNDO +1": "撤回 +1", "SHUFFLE +1": "洗牌 +1", "MOVE +1": "移出 +1", "HINT +1": "提示 +1",
    "FREEZE +1": "冻结 +1",
    "TAP ? TO PREVIEW A PROP": "点击 ? 查看道具作用", "PROP GUIDE": "道具说明", "ANIMATED PREVIEW": "动态效果演示",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "将最近选择的一张牌撤回到牌堆。",
    "REARRANGES ALL REMAINING TILES ON THE BOARD.": "重新排列牌堆中所有剩余麻将牌。",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "将槽位中的最多三张牌暂时移出。",
    "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "高亮提示可以组成消除的麻将牌。",
    "PRIVACY & TERMS": "隐私与协议", "PRIVACY & USER AGREEMENT": "隐私政策与用户协议", "VERSION 1": "版本 1",
    "PLEASE READ BEFORE CONTINUING": "继续游戏前请阅读并确认", "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "你可以随时查看本协议",
    "VIEW PLATFORM PRIVACY GUIDE": "查看平台隐私保护指引", "CONFIRM": "确定",
    "LANGUAGE": "语言", "TAP TO CHOOSE, THEN CONFIRM": "点击选择语言，然后确认", "SELECT LANGUAGE": "选择语言", "CANCEL": "取消",
    "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "需要同意协议后才能继续，请关闭游戏退出。",
    "TASKS & ACHIEVEMENTS": "任务与成就", "DAILY TASKS": "每日任务", "ACHIEVEMENTS": "成就",
    "CLAIMED": "已领取", "IN PROGRESS": "进行中", "REWARD COLLECTED": "奖励已领取",
    "DAILY CHALLENGE": "每日挑战", "CHALLENGE COMPLETE": "挑战完成", "SPECIAL LAYOUT": "特殊布局",
    "TODAY'S REWARD COLLECTED": "今日奖励已领取", "COMPLETE ONCE TO EARN THE REWARD": "今日首次完成可领取奖励",
    "PLAY AGAIN": "再次挑战", "START CHALLENGE": "开始挑战", "HOME": "返回主页",
    "SELECTED": "已选择", "SELECT": "选择", "THEME SELECTED": "主题已启用",
    "DECORATIONS & BUFFS": "装饰与增益", "ACHIEVEMENT REWARD": "成就奖励", "UNLOCKED BY ACHIEVEMENT": "完成对应成就后解锁",
    "FREEZE": "冻结", "TIME LEVELS ONLY": "仅倒计时关卡可用", "TIME FROZEN · 20S": "时间冻结 20 秒",
    "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "冻结关卡倒计时 20 秒。",
    "NEXT": "下一步", "START PLAYING": "开始闯关",
};

const ID: Record<string, string> = {
    "Mahjong Triple Quest": "Petualangan Tiga Mahjong",
    "MAHJONG": "MAHJONG", "TRIPLE QUEST": "PETUALANGAN TIGA", "PICK · SLOT · MATCH": "PILIH · SIMPAN · COCOKKAN",
    "PLAY": "MAIN", "SETTINGS": "PENGATURAN", "SHOP": "TOKO", "DAILY": "HARIAN", "SHARE": "BAGIKAN",
    "TASKS": "TUGAS", "CHALLENGE": "TANTANGAN HARIAN", "THEMES": "TEMA", "DECOR": "DEKORASI",
    "LEVEL": "LEVEL", "COINS": "KOIN", "OWNED": "DIMILIKI", "CLAIM": "AMBIL", "WATCH AD · GET": "TONTON IKLAN · DAPAT",
    "DAY": "HARI", "COMPLETE": "SELESAI", "COMBO": "KOMBO", "CLEAR EVERY MAHJONG STACK": "BERSIHKAN SEMUA TUMPUKAN MAHJONG",
    "SELECT LEVEL": "PILIH LEVEL", "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "SELESAIKAN LEVEL INI UNTUK MEMBUKA LEVEL BERIKUTNYA",
    "SCORE": "SKOR", "TIME": "WAKTU", "MOVES": "LANGKAH", "TIME UP": "WAKTU HABIS", "OUT OF MOVES": "LANGKAH HABIS",
    "UNDO": "URUNGKAN", "SHUFFLE": "ACAK", "MOVE OUT": "PINDAHKAN", "HINT": "PETUNJUK", "CURRENT": "SAAT INI",
    "COMPLETED": "SELESAI", "LOCKED": "TERKUNCI", "LEVEL COMPLETE": "LEVEL SELESAI", "NO SPACE": "TIDAK ADA RUANG",
    "NEXT LEVEL": "LEVEL BERIKUTNYA", "RESTART": "ULANGI", "LEVEL SELECT": "PILIH LEVEL", "NO MORE CONTINUES": "TIDAK ADA LANJUTAN LAGI",
    "WATCH AD · CONTINUE": "TONTON IKLAN · LANJUTKAN", "CLOSE": "TUTUP", "MUSIC AND SOUND": "MUSIK DAN SUARA",
    "WATCH AD · +2 MOVES": "TONTON IKLAN · +2 LANGKAH", "WATCH AD · +30 SECONDS": "TONTON IKLAN · +30 DETIK",
    "MUSIC: ON": "MUSIK: AKTIF", "MUSIC: OFF": "MUSIK: NONAKTIF", "SOUND: ON": "SUARA: AKTIF", "SOUND: OFF": "SUARA: NONAKTIF",
    "DAILY REWARD": "HADIAH HARIAN", "WATCH AN AD FOR 2X": "TONTON IKLAN UNTUK 2X", "YOUR DAILY COINS ARE READY": "KOIN HARIANMU SIAP",
    "COMING SOON": "SEGERA HADIR", "GOT IT": "MENGERTI", "CLAIMED TODAY": "SUDAH DIAMBIL HARI INI", "COME BACK TOMORROW": "KEMBALI BESOK",
    "PLAYING REWARDED AD...": "MEMUTAR IKLAN BERHADIAH...", "WATCH THE FULL AD TO GET 2X": "TONTON IKLAN SAMPAI SELESAI UNTUK 2X",
    "NOT ENOUGH COINS": "KOIN TIDAK CUKUP", "SPECIAL DRAGONS": "NAGA SPESIAL", "SEQUENCE": "URUTAN", "MATCH 3": "COCOKKAN 3",
    "FREE PROP +1": "ITEM GRATIS +1", "NO SPACE. TRY AGAIN": "TIDAK ADA RUANG. COBA LAGI", "LOADING REWARDED AD...": "MEMUAT IKLAN BERHADIAH...",
    "TIME UP. TRY AGAIN": "WAKTU HABIS. COBA LAGI", "OUT OF MOVES. TRY AGAIN": "LANGKAH HABIS. COBA LAGI",
    "AD NOT AVAILABLE. TRY AGAIN": "IKLAN TIDAK TERSEDIA. COBA LAGI", "CONTINUE": "LANJUTKAN",
    "TAP A FREE TILE": "KETUK UBIN YANG BEBAS", "TAP TWO MORE MATCHING TILES": "KETUK DUA UBIN SAMA LAGI",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "TIGA UBIN SAMA AKAN HILANG OTOMATIS", "MATCH COMPLETE! ONLY 7 SLOTS": "COCOK! HANYA ADA 7 SLOT",
    "UNDO +1": "URUNGKAN +1", "SHUFFLE +1": "ACAK +1", "MOVE +1": "PINDAH +1", "HINT +1": "PETUNJUK +1", "FREEZE +1": "BEKU +1",
    "TAP ? TO PREVIEW A PROP": "KETUK ? UNTUK MELIHAT ITEM", "PROP GUIDE": "PANDUAN ITEM", "ANIMATED PREVIEW": "PRATINJAU ANIMASI",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "MENGEMBALIKAN UBIN TERAKHIR KE PAPAN.", "REARRANGES ALL REMAINING TILES ON THE BOARD.": "MENGACAK SEMUA UBIN YANG TERSISA.",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "MEMINDAHKAN HINGGA TIGA UBIN KE AREA SEMENTARA.", "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "MENANDAI UBIN YANG BISA DICOCOKKAN.",
    "PRIVACY & TERMS": "PRIVASI & KETENTUAN", "PRIVACY & USER AGREEMENT": "PRIVASI & PERJANJIAN PENGGUNA", "VERSION 1": "VERSI 1",
    "PLEASE READ BEFORE CONTINUING": "BACA SEBELUM MELANJUTKAN", "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "ANDA DAPAT MEMBACA PERJANJIAN INI KAPAN SAJA",
    "VIEW PLATFORM PRIVACY GUIDE": "LIHAT PANDUAN PRIVASI PLATFORM", "CONFIRM": "KONFIRMASI", "LANGUAGE": "BAHASA",
    "TAP TO CHOOSE, THEN CONFIRM": "KETUK UNTUK MEMILIH, LALU KONFIRMASI", "SELECT LANGUAGE": "PILIH BAHASA", "CANCEL": "BATAL",
    "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "PERSETUJUAN DIPERLUKAN. TUTUP GAME UNTUK KELUAR.",
    "TASKS & ACHIEVEMENTS": "TUGAS & PENCAPAIAN", "DAILY TASKS": "TUGAS HARIAN", "ACHIEVEMENTS": "PENCAPAIAN", "CLAIMED": "SUDAH DIAMBIL",
    "IN PROGRESS": "SEDANG BERJALAN", "REWARD COLLECTED": "HADIAH DIAMBIL", "DAILY CHALLENGE": "TANTANGAN HARIAN",
    "CHALLENGE COMPLETE": "TANTANGAN SELESAI", "SPECIAL LAYOUT": "TATA LETAK KHUSUS", "TODAY'S REWARD COLLECTED": "HADIAH HARI INI SUDAH DIAMBIL",
    "COMPLETE ONCE TO EARN THE REWARD": "SELESAIKAN SEKALI UNTUK MENDAPAT HADIAH", "PLAY AGAIN": "MAIN LAGI", "START CHALLENGE": "MULAI TANTANGAN", "HOME": "BERANDA",
    "SELECTED": "DIPILIH", "SELECT": "PILIH", "THEME SELECTED": "TEMA DIPILIH", "DECORATIONS & BUFFS": "DEKORASI & BONUS",
    "ACHIEVEMENT REWARD": "HADIAH PENCAPAIAN", "UNLOCKED BY ACHIEVEMENT": "DIBUKA MELALUI PENCAPAIAN", "FREEZE": "BEKUKAN",
    "TIME LEVELS ONLY": "KHUSUS LEVEL BERWAKTU", "TIME FROZEN · 20S": "WAKTU DIBEKUKAN · 20D", "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "MEMBEKUKAN WAKTU LEVEL SELAMA 20 DETIK.",
    "NEXT": "BERIKUTNYA", "START PLAYING": "MULAI MAIN",
};

const TH: Record<string, string> = {
    "Mahjong Triple Quest": "ภารกิจไพ่นกกระจอกสามใบ", "MAHJONG": "ไพ่นกกระจอก", "TRIPLE QUEST": "ภารกิจสามใบ", "PICK · SLOT · MATCH": "เลือก · วาง · จับคู่",
    "PLAY": "เล่น", "SETTINGS": "ตั้งค่า", "SHOP": "ร้านค้า", "DAILY": "รายวัน", "SHARE": "แชร์", "TASKS": "ภารกิจ", "CHALLENGE": "ท้าทายรายวัน", "THEMES": "ธีม", "DECOR": "ตกแต่ง",
    "LEVEL": "ด่าน", "COINS": "เหรียญ", "OWNED": "มี", "CLAIM": "รับ", "WATCH AD · GET": "ดูโฆษณา · รับ", "DAY": "วันที่", "COMPLETE": "สำเร็จ", "COMBO": "คอมโบ",
    "CLEAR EVERY MAHJONG STACK": "เคลียร์กองไพ่นกกระจอกทั้งหมด", "SELECT LEVEL": "เลือกด่าน", "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "ผ่านด่านนี้เพื่อปลดล็อกด่านถัดไป",
    "SCORE": "คะแนน", "TIME": "เวลา", "MOVES": "จำนวนเดิน", "TIME UP": "หมดเวลา", "OUT OF MOVES": "จำนวนเดินหมด", "UNDO": "ย้อนกลับ", "SHUFFLE": "สับไพ่", "MOVE OUT": "ย้ายออก", "HINT": "คำใบ้",
    "CURRENT": "ปัจจุบัน", "COMPLETED": "สำเร็จ", "LOCKED": "ล็อก", "LEVEL COMPLETE": "ผ่านด่าน", "NO SPACE": "ไม่มีที่ว่าง", "NEXT LEVEL": "ด่านถัดไป", "RESTART": "เริ่มใหม่", "LEVEL SELECT": "เลือกด่าน",
    "NO MORE CONTINUES": "ไปต่อไม่ได้แล้ว", "WATCH AD · CONTINUE": "ดูโฆษณา · เล่นต่อ", "CLOSE": "ปิด", "MUSIC AND SOUND": "เพลงและเสียง",
    "WATCH AD · +2 MOVES": "ดูโฆษณา · +2 ครั้ง", "WATCH AD · +30 SECONDS": "ดูโฆษณา · +30 วินาที", "MUSIC: ON": "เพลง: เปิด", "MUSIC: OFF": "เพลง: ปิด", "SOUND: ON": "เสียง: เปิด", "SOUND: OFF": "เสียง: ปิด",
    "DAILY REWARD": "รางวัลรายวัน", "WATCH AN AD FOR 2X": "ดูโฆษณาเพื่อรับ 2 เท่า", "YOUR DAILY COINS ARE READY": "เหรียญรายวันพร้อมแล้ว", "COMING SOON": "เร็ว ๆ นี้", "GOT IT": "เข้าใจแล้ว",
    "CLAIMED TODAY": "รับแล้ววันนี้", "COME BACK TOMORROW": "กลับมาใหม่พรุ่งนี้", "PLAYING REWARDED AD...": "กำลังเล่นโฆษณารางวัล...", "WATCH THE FULL AD TO GET 2X": "ดูโฆษณาจนจบเพื่อรับ 2 เท่า",
    "NOT ENOUGH COINS": "เหรียญไม่พอ", "SPECIAL DRAGONS": "มังกรพิเศษ", "SEQUENCE": "เรียงชุด", "MATCH 3": "จับคู่ 3", "FREE PROP +1": "ไอเทมฟรี +1",
    "NO SPACE. TRY AGAIN": "ไม่มีที่ว่าง ลองอีกครั้ง", "LOADING REWARDED AD...": "กำลังโหลดโฆษณารางวัล...", "TIME UP. TRY AGAIN": "หมดเวลา ลองอีกครั้ง", "OUT OF MOVES. TRY AGAIN": "จำนวนเดินหมด ลองอีกครั้ง",
    "AD NOT AVAILABLE. TRY AGAIN": "โฆษณาไม่พร้อม ลองอีกครั้ง", "CONTINUE": "เล่นต่อ", "TAP A FREE TILE": "แตะไพ่ที่ไม่ถูกบัง", "TAP TWO MORE MATCHING TILES": "แตะไพ่เหมือนกันอีกสองใบ",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "ไพ่เหมือนกันสามใบจะหายอัตโนมัติ", "MATCH COMPLETE! ONLY 7 SLOTS": "จับคู่สำเร็จ! มีเพียง 7 ช่อง",
    "UNDO +1": "ย้อนกลับ +1", "SHUFFLE +1": "สับไพ่ +1", "MOVE +1": "ย้าย +1", "HINT +1": "คำใบ้ +1", "FREEZE +1": "หยุดเวลา +1",
    "TAP ? TO PREVIEW A PROP": "แตะ ? เพื่อดูไอเทม", "PROP GUIDE": "คู่มือไอเทม", "ANIMATED PREVIEW": "ตัวอย่างภาพเคลื่อนไหว",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "คืนไพ่ที่เลือกล่าสุดกลับไปบนกระดาน", "REARRANGES ALL REMAINING TILES ON THE BOARD.": "จัดเรียงไพ่ที่เหลือใหม่ทั้งหมด",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "ย้ายไพ่ในช่องได้สูงสุดสามใบไปยังพื้นที่ชั่วคราว", "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "ไฮไลต์ไพ่ที่สามารถจับคู่ได้",
    "PRIVACY & TERMS": "ความเป็นส่วนตัวและข้อกำหนด", "PRIVACY & USER AGREEMENT": "ความเป็นส่วนตัวและข้อตกลงผู้ใช้", "VERSION 1": "เวอร์ชัน 1",
    "PLEASE READ BEFORE CONTINUING": "โปรดอ่านก่อนดำเนินการต่อ", "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "คุณสามารถอ่านข้อตกลงนี้ได้ทุกเมื่อ", "VIEW PLATFORM PRIVACY GUIDE": "ดูคู่มือความเป็นส่วนตัวของแพลตฟอร์ม",
    "CONFIRM": "ยืนยัน", "LANGUAGE": "ภาษา", "TAP TO CHOOSE, THEN CONFIRM": "แตะเพื่อเลือก แล้วกดยืนยัน", "SELECT LANGUAGE": "เลือกภาษา", "CANCEL": "ยกเลิก",
    "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "ต้องให้ความยินยอมเพื่อดำเนินการต่อ ปิดเกมเพื่อออก", "TASKS & ACHIEVEMENTS": "ภารกิจและความสำเร็จ", "DAILY TASKS": "ภารกิจรายวัน", "ACHIEVEMENTS": "ความสำเร็จ",
    "CLAIMED": "รับแล้ว", "IN PROGRESS": "กำลังดำเนินการ", "REWARD COLLECTED": "รับรางวัลแล้ว", "DAILY CHALLENGE": "ท้าทายรายวัน", "CHALLENGE COMPLETE": "ทำภารกิจสำเร็จ", "SPECIAL LAYOUT": "รูปแบบพิเศษ",
    "TODAY'S REWARD COLLECTED": "รับรางวัลวันนี้แล้ว", "COMPLETE ONCE TO EARN THE REWARD": "ทำสำเร็จหนึ่งครั้งเพื่อรับรางวัล", "PLAY AGAIN": "เล่นอีกครั้ง", "START CHALLENGE": "เริ่มท้าทาย", "HOME": "หน้าหลัก",
    "SELECTED": "เลือกแล้ว", "SELECT": "เลือก", "THEME SELECTED": "เลือกธีมแล้ว", "DECORATIONS & BUFFS": "ของตกแต่งและบัฟ", "ACHIEVEMENT REWARD": "รางวัลความสำเร็จ", "UNLOCKED BY ACHIEVEMENT": "ปลดล็อกด้วยความสำเร็จ",
    "FREEZE": "หยุดเวลา", "TIME LEVELS ONLY": "เฉพาะด่านจับเวลา", "TIME FROZEN · 20S": "หยุดเวลา · 20 วิ", "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "หยุดเวลาของด่านเป็นเวลา 20 วินาที", "NEXT": "ถัดไป", "START PLAYING": "เริ่มเล่น",
};

const JA: Record<string, string> = {
    "Mahjong Triple Quest": "麻雀トリプルクエスト", "MAHJONG": "麻雀", "TRIPLE QUEST": "トリプルクエスト", "PICK · SLOT · MATCH": "選ぶ · 入れる · 揃える",
    "PLAY": "プレイ", "SETTINGS": "設定", "SHOP": "ショップ", "DAILY": "デイリー", "SHARE": "シェア", "TASKS": "ミッション", "CHALLENGE": "デイリーチャレンジ", "THEMES": "テーマ", "DECOR": "装飾",
    "LEVEL": "レベル", "COINS": "コイン", "OWNED": "所持", "CLAIM": "受け取る", "WATCH AD · GET": "広告を見る · 獲得", "DAY": "日目", "COMPLETE": "完了", "COMBO": "コンボ",
    "CLEAR EVERY MAHJONG STACK": "すべての麻雀牌を消そう", "SELECT LEVEL": "レベル選択", "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "このレベルをクリアして次を解放",
    "SCORE": "スコア", "TIME": "時間", "MOVES": "手数", "TIME UP": "時間切れ", "OUT OF MOVES": "手数切れ", "UNDO": "戻す", "SHUFFLE": "シャッフル", "MOVE OUT": "移動", "HINT": "ヒント",
    "CURRENT": "現在", "COMPLETED": "クリア済み", "LOCKED": "未解放", "LEVEL COMPLETE": "レベルクリア", "NO SPACE": "空きがありません", "NEXT LEVEL": "次のレベル", "RESTART": "やり直す", "LEVEL SELECT": "レベル選択",
    "NO MORE CONTINUES": "これ以上続行できません", "WATCH AD · CONTINUE": "広告を見る · 続ける", "CLOSE": "閉じる", "MUSIC AND SOUND": "音楽と効果音",
    "WATCH AD · +2 MOVES": "広告を見る · 手数+2", "WATCH AD · +30 SECONDS": "広告を見る · 30秒追加", "MUSIC: ON": "音楽：オン", "MUSIC: OFF": "音楽：オフ", "SOUND: ON": "効果音：オン", "SOUND: OFF": "効果音：オフ",
    "DAILY REWARD": "デイリー報酬", "WATCH AN AD FOR 2X": "広告を見て2倍", "YOUR DAILY COINS ARE READY": "デイリーコインを受け取れます", "COMING SOON": "近日公開", "GOT IT": "わかりました",
    "CLAIMED TODAY": "本日受取済み", "COME BACK TOMORROW": "明日また来てください", "PLAYING REWARDED AD...": "報酬広告を再生中...", "WATCH THE FULL AD TO GET 2X": "最後まで見て報酬2倍",
    "NOT ENOUGH COINS": "コインが足りません", "SPECIAL DRAGONS": "三元牌", "SEQUENCE": "順子", "MATCH 3": "3枚揃え", "FREE PROP +1": "無料アイテム +1",
    "NO SPACE. TRY AGAIN": "空きがありません。もう一度お試しください", "LOADING REWARDED AD...": "報酬広告を読み込み中...", "TIME UP. TRY AGAIN": "時間切れです。もう一度お試しください", "OUT OF MOVES. TRY AGAIN": "手数切れです。もう一度お試しください",
    "AD NOT AVAILABLE. TRY AGAIN": "広告を利用できません。もう一度お試しください", "CONTINUE": "続ける", "TAP A FREE TILE": "空いている牌をタップ", "TAP TWO MORE MATCHING TILES": "同じ牌をあと2枚タップ",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "同じ牌が3枚揃うと自動で消えます", "MATCH COMPLETE! ONLY 7 SLOTS": "揃いました！スロットは7つだけです",
    "UNDO +1": "戻す +1", "SHUFFLE +1": "シャッフル +1", "MOVE +1": "移動 +1", "HINT +1": "ヒント +1", "FREEZE +1": "時間停止 +1",
    "TAP ? TO PREVIEW A PROP": "? をタップしてアイテムを確認", "PROP GUIDE": "アイテムガイド", "ANIMATED PREVIEW": "アニメーションプレビュー",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "最後に選んだ牌を盤面に戻します。", "REARRANGES ALL REMAINING TILES ON THE BOARD.": "盤面に残った牌をすべて並べ直します。",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "スロットの牌を最大3枚、一時エリアへ移動します。", "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "揃えられる牌を強調表示します。",
    "PRIVACY & TERMS": "プライバシーと規約", "PRIVACY & USER AGREEMENT": "プライバシーと利用規約", "VERSION 1": "バージョン1", "PLEASE READ BEFORE CONTINUING": "続ける前にお読みください",
    "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "この規約はいつでも確認できます", "VIEW PLATFORM PRIVACY GUIDE": "プラットフォームのプライバシーガイドを見る", "CONFIRM": "決定", "LANGUAGE": "言語",
    "TAP TO CHOOSE, THEN CONFIRM": "タップして選択し、決定してください", "SELECT LANGUAGE": "言語を選択", "CANCEL": "キャンセル", "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "続けるには同意が必要です。終了するにはゲームを閉じてください。",
    "TASKS & ACHIEVEMENTS": "ミッションと実績", "DAILY TASKS": "デイリーミッション", "ACHIEVEMENTS": "実績", "CLAIMED": "受取済み", "IN PROGRESS": "進行中", "REWARD COLLECTED": "報酬受取済み",
    "DAILY CHALLENGE": "デイリーチャレンジ", "CHALLENGE COMPLETE": "チャレンジ完了", "SPECIAL LAYOUT": "特別配置", "TODAY'S REWARD COLLECTED": "本日の報酬は受取済み",
    "COMPLETE ONCE TO EARN THE REWARD": "1回クリアして報酬を獲得", "PLAY AGAIN": "もう一度遊ぶ", "START CHALLENGE": "チャレンジ開始", "HOME": "ホーム", "SELECTED": "選択中", "SELECT": "選択",
    "THEME SELECTED": "テーマを選択しました", "DECORATIONS & BUFFS": "装飾とボーナス", "ACHIEVEMENT REWARD": "実績報酬", "UNLOCKED BY ACHIEVEMENT": "実績で解放", "FREEZE": "時間停止",
    "TIME LEVELS ONLY": "時間制限レベルのみ", "TIME FROZEN · 20S": "時間停止 · 20秒", "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "レベルのタイマーを20秒停止します。", "NEXT": "次へ", "START PLAYING": "プレイ開始",
};

const FR: Record<string, string> = {
    "Mahjong Triple Quest": "Mahjong Triple Quête", "MAHJONG": "MAHJONG", "TRIPLE QUEST": "TRIPLE QUÊTE", "PICK · SLOT · MATCH": "CHOISIR · PLACER · ASSOCIER",
    "PLAY": "JOUER", "SETTINGS": "PARAMÈTRES", "SHOP": "BOUTIQUE", "DAILY": "QUOTIDIEN", "SHARE": "PARTAGER", "TASKS": "MISSIONS", "CHALLENGE": "DÉFI DU JOUR", "THEMES": "THÈMES", "DECOR": "DÉCOR",
    "LEVEL": "NIVEAU", "COINS": "PIÈCES", "OWNED": "POSSÉDÉ", "CLAIM": "RÉCUPÉRER", "WATCH AD · GET": "VOIR LA PUB · OBTENIR", "DAY": "JOUR", "COMPLETE": "TERMINÉ", "COMBO": "COMBO",
    "CLEAR EVERY MAHJONG STACK": "ÉLIMINEZ TOUTES LES PILES DE MAHJONG", "SELECT LEVEL": "CHOISIR UN NIVEAU", "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "TERMINEZ CE NIVEAU POUR DÉBLOQUER LE SUIVANT",
    "SCORE": "SCORE", "TIME": "TEMPS", "MOVES": "COUPS", "TIME UP": "TEMPS ÉCOULÉ", "OUT OF MOVES": "PLUS DE COUPS", "UNDO": "ANNULER", "SHUFFLE": "MÉLANGER", "MOVE OUT": "DÉPLACER", "HINT": "INDICE",
    "CURRENT": "ACTUEL", "COMPLETED": "TERMINÉ", "LOCKED": "VERROUILLÉ", "LEVEL COMPLETE": "NIVEAU TERMINÉ", "NO SPACE": "PLUS DE PLACE", "NEXT LEVEL": "NIVEAU SUIVANT", "RESTART": "RECOMMENCER", "LEVEL SELECT": "CHOIX DU NIVEAU",
    "NO MORE CONTINUES": "PLUS AUCUNE CONTINUATION", "WATCH AD · CONTINUE": "VOIR LA PUB · CONTINUER", "CLOSE": "FERMER", "MUSIC AND SOUND": "MUSIQUE ET SONS",
    "WATCH AD · +2 MOVES": "VOIR LA PUB · +2 COUPS", "WATCH AD · +30 SECONDS": "VOIR LA PUB · +30 SECONDES", "MUSIC: ON": "MUSIQUE : OUI", "MUSIC: OFF": "MUSIQUE : NON", "SOUND: ON": "SONS : OUI", "SOUND: OFF": "SONS : NON",
    "DAILY REWARD": "RÉCOMPENSE DU JOUR", "WATCH AN AD FOR 2X": "VOIR UNE PUB POUR X2", "YOUR DAILY COINS ARE READY": "VOS PIÈCES QUOTIDIENNES SONT PRÊTES", "COMING SOON": "BIENTÔT", "GOT IT": "COMPRIS",
    "CLAIMED TODAY": "RÉCUPÉRÉ AUJOURD'HUI", "COME BACK TOMORROW": "REVENEZ DEMAIN", "PLAYING REWARDED AD...": "LECTURE DE LA PUB RÉCOMPENSÉE...", "WATCH THE FULL AD TO GET 2X": "REGARDEZ LA PUB EN ENTIER POUR X2",
    "NOT ENOUGH COINS": "PAS ASSEZ DE PIÈCES", "SPECIAL DRAGONS": "HONNEURS SPÉCIAUX", "SEQUENCE": "SUITE", "MATCH 3": "ASSOCIER 3", "FREE PROP +1": "OBJET GRATUIT +1",
    "NO SPACE. TRY AGAIN": "PLUS DE PLACE. RÉESSAYEZ", "LOADING REWARDED AD...": "CHARGEMENT DE LA PUB...", "TIME UP. TRY AGAIN": "TEMPS ÉCOULÉ. RÉESSAYEZ", "OUT OF MOVES. TRY AGAIN": "PLUS DE COUPS. RÉESSAYEZ",
    "AD NOT AVAILABLE. TRY AGAIN": "PUB INDISPONIBLE. RÉESSAYEZ", "CONTINUE": "CONTINUER", "TAP A FREE TILE": "TOUCHEZ UNE TUILE LIBRE", "TAP TWO MORE MATCHING TILES": "TOUCHEZ DEUX AUTRES TUILES IDENTIQUES",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "TROIS TUILES IDENTIQUES DISPARAISSENT AUTOMATIQUEMENT", "MATCH COMPLETE! ONLY 7 SLOTS": "ASSOCIATION RÉUSSIE ! SEULEMENT 7 PLACES",
    "UNDO +1": "ANNULER +1", "SHUFFLE +1": "MÉLANGER +1", "MOVE +1": "DÉPLACER +1", "HINT +1": "INDICE +1", "FREEZE +1": "GELER +1",
    "TAP ? TO PREVIEW A PROP": "TOUCHEZ ? POUR VOIR L'OBJET", "PROP GUIDE": "GUIDE DES OBJETS", "ANIMATED PREVIEW": "APERÇU ANIMÉ",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "REMET LA DERNIÈRE TUILE SÉLECTIONNÉE SUR LE PLATEAU.", "REARRANGES ALL REMAINING TILES ON THE BOARD.": "RÉORGANISE TOUTES LES TUILES RESTANTES.",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "DÉPLACE JUSQU'À TROIS TUILES VERS UNE ZONE TEMPORAIRE.", "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "MET EN ÉVIDENCE LES TUILES ASSOCIABlES.",
    "PRIVACY & TERMS": "CONFIDENTIALITÉ ET CONDITIONS", "PRIVACY & USER AGREEMENT": "CONFIDENTIALITÉ ET ACCORD UTILISATEUR", "VERSION 1": "VERSION 1", "PLEASE READ BEFORE CONTINUING": "VEUILLEZ LIRE AVANT DE CONTINUER",
    "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "VOUS POUVEZ RELIRE CET ACCORD À TOUT MOMENT", "VIEW PLATFORM PRIVACY GUIDE": "VOIR LE GUIDE DE CONFIDENTIALITÉ", "CONFIRM": "CONFIRMER", "LANGUAGE": "LANGUE",
    "TAP TO CHOOSE, THEN CONFIRM": "TOUCHEZ POUR CHOISIR, PUIS CONFIRMEZ", "SELECT LANGUAGE": "CHOISIR LA LANGUE", "CANCEL": "ANNULER", "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "LE CONSENTEMENT EST REQUIS. FERMEZ LE JEU POUR QUITTER.",
    "TASKS & ACHIEVEMENTS": "MISSIONS ET SUCCÈS", "DAILY TASKS": "MISSIONS DU JOUR", "ACHIEVEMENTS": "SUCCÈS", "CLAIMED": "RÉCUPÉRÉ", "IN PROGRESS": "EN COURS", "REWARD COLLECTED": "RÉCOMPENSE RÉCUPÉRÉE",
    "DAILY CHALLENGE": "DÉFI DU JOUR", "CHALLENGE COMPLETE": "DÉFI TERMINÉ", "SPECIAL LAYOUT": "DISPOSITION SPÉCIALE", "TODAY'S REWARD COLLECTED": "RÉCOMPENSE DU JOUR RÉCUPÉRÉE",
    "COMPLETE ONCE TO EARN THE REWARD": "TERMINEZ UNE FOIS POUR GAGNER LA RÉCOMPENSE", "PLAY AGAIN": "REJOUER", "START CHALLENGE": "COMMENCER LE DÉFI", "HOME": "ACCUEIL", "SELECTED": "SÉLECTIONNÉ", "SELECT": "SÉLECTIONNER",
    "THEME SELECTED": "THÈME SÉLECTIONNÉ", "DECORATIONS & BUFFS": "DÉCORATIONS ET BONUS", "ACHIEVEMENT REWARD": "RÉCOMPENSE DE SUCCÈS", "UNLOCKED BY ACHIEVEMENT": "DÉBLOQUÉ PAR UN SUCCÈS", "FREEZE": "GELER",
    "TIME LEVELS ONLY": "NIVEAUX CHRONOMÉTRÉS UNIQUEMENT", "TIME FROZEN · 20S": "TEMPS GELÉ · 20 S", "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "GÈLE LE CHRONOMÈTRE DU NIVEAU PENDANT 20 SECONDES.", "NEXT": "SUIVANT", "START PLAYING": "COMMENCER",
};

Object.assign(ID, {
    "Monday: Complete 1 Level": "Senin: Selesaikan 1 Level", "Tuesday: Make 10 Matches": "Selasa: Buat 10 Kecocokan", "Wednesday: Use Hint Once": "Rabu: Gunakan Petunjuk Sekali",
    "Thursday: Earn 5 Stars": "Kamis: Raih 5 Bintang", "Friday: Reach a 2 Combo": "Jumat: Raih Kombo 2", "Saturday: Use Freeze Once": "Sabtu: Gunakan Beku Sekali", "Sunday: Complete 3 Levels": "Minggu: Selesaikan 3 Level",
    "First Clear": "Kemenangan Pertama", "Make 50 Matches": "Buat 50 Kecocokan", "Earn 15 Stars": "Raih 15 Bintang", "Reach a 2 Combo": "Raih Kombo 2", "Use Hint 3 Times": "Gunakan Petunjuk 3 Kali",
    "Clear 10 Levels: Unlock Jade Decor": "Selesaikan 10 Level: Buka Dekorasi Giok", "Use Freeze 5 Times": "Gunakan Beku 5 Kali", "Make 200 Matches": "Buat 200 Kecocokan",
    "Earn 30 Stars: Unlock Amber Decor": "Raih 30 Bintang: Buka Dekorasi Amber", "Complete 50 Levels": "Selesaikan 50 Level",
    "Classic": "Klasik", "Jade Buttons · Hint Buff": "Tombol Giok · Bonus Petunjuk", "Amber Tiles · Freeze Buff": "Ubin Amber · Bonus Beku",
    "Tap three matching One Characters. The set clears automatically.": "Ketuk tiga ubin Karakter Satu yang sama. Set akan hilang otomatis.",
    "Tap Hint to highlight tiles that can form a match.": "Ketuk Petunjuk untuk menandai ubin yang bisa dicocokkan.",
    "Daily Challenge offers one fixed special layout and a coin reward each day.": "Tantangan Harian menyediakan satu tata letak khusus dan hadiah koin setiap hari.",
    "Unlock themes with coins. Themes only change the appearance.": "Buka tema dengan koin. Tema hanya mengubah tampilan.",
    "Tasks and achievements reward level clears, matches and prop use.": "Tugas dan pencapaian memberi hadiah untuk level, kecocokan, dan penggunaan item.",
    "Claim daily coins here, or watch an ad to double the reward.": "Ambil koin harian di sini, atau tonton iklan untuk menggandakan hadiah.",
});
Object.assign(TH, {
    "Monday: Complete 1 Level": "วันจันทร์: ผ่าน 1 ด่าน", "Tuesday: Make 10 Matches": "วันอังคาร: จับคู่ 10 ครั้ง", "Wednesday: Use Hint Once": "วันพุธ: ใช้คำใบ้ 1 ครั้ง",
    "Thursday: Earn 5 Stars": "วันพฤหัสบดี: รับ 5 ดาว", "Friday: Reach a 2 Combo": "วันศุกร์: ทำคอมโบ 2", "Saturday: Use Freeze Once": "วันเสาร์: ใช้หยุดเวลา 1 ครั้ง", "Sunday: Complete 3 Levels": "วันอาทิตย์: ผ่าน 3 ด่าน",
    "First Clear": "ผ่านครั้งแรก", "Make 50 Matches": "จับคู่ 50 ครั้ง", "Earn 15 Stars": "รับ 15 ดาว", "Reach a 2 Combo": "ทำคอมโบ 2", "Use Hint 3 Times": "ใช้คำใบ้ 3 ครั้ง",
    "Clear 10 Levels: Unlock Jade Decor": "ผ่าน 10 ด่าน: ปลดล็อกของตกแต่งหยก", "Use Freeze 5 Times": "ใช้หยุดเวลา 5 ครั้ง", "Make 200 Matches": "จับคู่ 200 ครั้ง",
    "Earn 30 Stars: Unlock Amber Decor": "รับ 30 ดาว: ปลดล็อกของตกแต่งอำพัน", "Complete 50 Levels": "ผ่าน 50 ด่าน",
    "Classic": "คลาสสิก", "Jade Buttons · Hint Buff": "ปุ่มหยก · บัฟคำใบ้", "Amber Tiles · Freeze Buff": "ไพ่อำพัน · บัฟหยุดเวลา",
    "Tap three matching One Characters. The set clears automatically.": "แตะไพ่หนึ่งหมื่นที่เหมือนกันสามใบ แล้วไพ่จะหายอัตโนมัติ",
    "Tap Hint to highlight tiles that can form a match.": "แตะคำใบ้เพื่อไฮไลต์ไพ่ที่จับคู่ได้",
    "Daily Challenge offers one fixed special layout and a coin reward each day.": "ท้าทายรายวันมีรูปแบบพิเศษหนึ่งแบบและรางวัลเหรียญทุกวัน",
    "Unlock themes with coins. Themes only change the appearance.": "ปลดล็อกธีมด้วยเหรียญ ธีมเปลี่ยนเฉพาะรูปลักษณ์",
    "Tasks and achievements reward level clears, matches and prop use.": "ภารกิจและความสำเร็จให้รางวัลจากการผ่านด่าน จับคู่ และใช้ไอเทม",
    "Claim daily coins here, or watch an ad to double the reward.": "รับเหรียญรายวันที่นี่ หรือดูโฆษณาเพื่อรับรางวัลสองเท่า",
});
Object.assign(JA, {
    "Monday: Complete 1 Level": "月曜日：1レベルクリア", "Tuesday: Make 10 Matches": "火曜日：10回揃える", "Wednesday: Use Hint Once": "水曜日：ヒントを1回使う",
    "Thursday: Earn 5 Stars": "木曜日：スターを5個獲得", "Friday: Reach a 2 Combo": "金曜日：2コンボ達成", "Saturday: Use Freeze Once": "土曜日：時間停止を1回使う", "Sunday: Complete 3 Levels": "日曜日：3レベルクリア",
    "First Clear": "初クリア", "Make 50 Matches": "50回揃える", "Earn 15 Stars": "スターを15個獲得", "Reach a 2 Combo": "2コンボ達成", "Use Hint 3 Times": "ヒントを3回使う",
    "Clear 10 Levels: Unlock Jade Decor": "10レベルクリア：翡翠の装飾を解放", "Use Freeze 5 Times": "時間停止を5回使う", "Make 200 Matches": "200回揃える",
    "Earn 30 Stars: Unlock Amber Decor": "スター30個：琥珀の装飾を解放", "Complete 50 Levels": "50レベルクリア",
    "Classic": "クラシック", "Jade Buttons · Hint Buff": "翡翠ボタン · ヒント強化", "Amber Tiles · Freeze Buff": "琥珀牌 · 時間停止強化",
    "Tap three matching One Characters. The set clears automatically.": "同じ一萬を3枚タップすると、自動で消えます。",
    "Tap Hint to highlight tiles that can form a match.": "ヒントをタップすると、揃えられる牌が強調されます。",
    "Daily Challenge offers one fixed special layout and a coin reward each day.": "デイリーチャレンジでは、毎日1つの特別配置とコイン報酬が用意されます。",
    "Unlock themes with coins. Themes only change the appearance.": "コインでテーマを解放できます。テーマは見た目だけを変更します。",
    "Tasks and achievements reward level clears, matches and prop use.": "ミッションと実績では、レベルクリア、揃えた回数、アイテム使用で報酬を獲得できます。",
    "Claim daily coins here, or watch an ad to double the reward.": "ここでデイリーコインを受け取るか、広告を見て報酬を2倍にできます。",
});
Object.assign(FR, {
    "Monday: Complete 1 Level": "Lundi : terminer 1 niveau", "Tuesday: Make 10 Matches": "Mardi : faire 10 associations", "Wednesday: Use Hint Once": "Mercredi : utiliser un indice",
    "Thursday: Earn 5 Stars": "Jeudi : gagner 5 étoiles", "Friday: Reach a 2 Combo": "Vendredi : atteindre un combo de 2", "Saturday: Use Freeze Once": "Samedi : utiliser le gel une fois", "Sunday: Complete 3 Levels": "Dimanche : terminer 3 niveaux",
    "First Clear": "Première victoire", "Make 50 Matches": "Faire 50 associations", "Earn 15 Stars": "Gagner 15 étoiles", "Reach a 2 Combo": "Atteindre un combo de 2", "Use Hint 3 Times": "Utiliser l'indice 3 fois",
    "Clear 10 Levels: Unlock Jade Decor": "Terminer 10 niveaux : débloquer le décor de jade", "Use Freeze 5 Times": "Utiliser le gel 5 fois", "Make 200 Matches": "Faire 200 associations",
    "Earn 30 Stars: Unlock Amber Decor": "Gagner 30 étoiles : débloquer le décor ambré", "Complete 50 Levels": "Terminer 50 niveaux",
    "Classic": "Classique", "Jade Buttons · Hint Buff": "Boutons de jade · bonus d'indice", "Amber Tiles · Freeze Buff": "Tuiles ambrées · bonus de gel",
    "Tap three matching One Characters. The set clears automatically.": "Touchez trois tuiles Un de Caractères identiques. Elles disparaissent automatiquement.",
    "Tap Hint to highlight tiles that can form a match.": "Touchez Indice pour mettre en évidence les tuiles associables.",
    "Daily Challenge offers one fixed special layout and a coin reward each day.": "Le défi du jour propose une disposition spéciale fixe et une récompense en pièces.",
    "Unlock themes with coins. Themes only change the appearance.": "Débloquez les thèmes avec des pièces. Ils ne changent que l'apparence.",
    "Tasks and achievements reward level clears, matches and prop use.": "Les missions et succès récompensent les niveaux, associations et objets utilisés.",
    "Claim daily coins here, or watch an ad to double the reward.": "Récupérez vos pièces quotidiennes ici ou regardez une pub pour doubler la récompense.",
});

const PACKS: Record<Exclude<UiLanguage, "" | "en">, Record<string, string>> = { id: ID, th: TH, ja: JA, fr: FR };

export function uiText(english: string): string {
    if (currentLanguage === "en") return english;
    const pack = currentLanguage === "" ? ZH : PACKS[currentLanguage];
    const exact = pack[english];
    if (exact) return exact;
    const language: "zh" | "id" | "th" | "ja" | "fr" = currentLanguage === "" ? "zh" : currentLanguage;
    let match = english.match(/^LEVEL (\d+)$/); if (match) return ({ zh: `关卡 ${match[1]}`, id: `LEVEL ${match[1]}`, th: `ด่าน ${match[1]}`, ja: `レベル ${match[1]}`, fr: `NIVEAU ${match[1]}` })[language];
    match = english.match(/^COINS (\d+)$/); if (match) return `${uiText("COINS")} ${match[1]}`;
    match = english.match(/^OWNED (\d+)$/); if (match) return `${uiText("OWNED")} ${match[1]}`;
    match = english.match(/^(\d+) COINS$/); if (match) return `${match[1]} ${uiText("COINS")}`;
    match = english.match(/^D(\d+)$/); if (match) return ({ zh: `第${match[1]}天`, id: `H${match[1]}`, th: `วันที่ ${match[1]}`, ja: `${match[1]}日目`, fr: `J${match[1]}` })[language];
    match = english.match(/^DAY (\d+) OF 7$/); if (match) return ({ zh: `第 ${match[1]} / 7 天`, id: `HARI ${match[1]} DARI 7`, th: `วันที่ ${match[1]} / 7`, ja: `${match[1]} / 7日目`, fr: `JOUR ${match[1]} SUR 7` })[language];
    match = english.match(/^DAY (\d+) COMPLETE$/); if (match) return ({ zh: `第 ${match[1]} 天已完成`, id: `HARI ${match[1]} SELESAI`, th: `วันที่ ${match[1]} สำเร็จ`, ja: `${match[1]}日目 完了`, fr: `JOUR ${match[1]} TERMINÉ` })[language];
    match = english.match(/^CLAIM (\d+)$/); if (match) return `${uiText("CLAIM")} ${match[1]}`;
    match = english.match(/^WATCH AD · GET (\d+)$/); if (match) return `${uiText("WATCH AD · GET")} ${match[1]}`;
    match = english.match(/^(\d+) COINS (COLLECTED|EARNED)$/); if (match) return `${match[1]} ${uiText("COINS")} · ${match[2] === "COLLECTED" ? uiText("CLAIMED") : uiText("REWARD COLLECTED")}`;
    match = english.match(/^(\d+) LEVELS · SWIPE TO SCROLL$/); if (match) return ({ zh: `共 ${match[1]} 关 · 上下滑动`, id: `${match[1]} LEVEL · GESER UNTUK MENGGULIR`, th: `${match[1]} ด่าน · ปัดเพื่อเลื่อน`, ja: `${match[1]}レベル · スワイプで移動`, fr: `${match[1]} NIVEAUX · BALAYEZ POUR DÉFILER` })[language];
    return english;
}

export function setUiLanguage(language: UiLanguage): void { currentLanguage = language; }
export function uiLanguage(): UiLanguage { return currentLanguage; }
export function localizedText(english: string, chinese: string): string { return currentLanguage === "" ? chinese : uiText(english); }
export function uiTextSelfCheck(): void {
    const previous = currentLanguage;
    for (const language of ["id", "th", "ja", "fr"] as UiLanguage[]) {
        setUiLanguage(language);
        if (uiText("SETTINGS") === "SETTINGS" || uiText("COINS 2") === "COINS 2") throw new Error(`Missing ${language} UI translations`);
    }
    setUiLanguage(previous);
}

export function localizeTree(root: Laya.Node): void {
    if (root.name === "DebugPanel") return;
    if (root instanceof Laya.GTextField) root.text = uiText(root.text);
    for (let index = 0; index < root.numChildren; index++) localizeTree(root.getChildAt(index));
}
