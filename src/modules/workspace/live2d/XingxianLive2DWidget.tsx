import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

type Point = { x: number; y: number };
type WorkspaceSummary = {
  topicName?: string;
  topicCount: number;
  activeInbox: number;
  activeLibrary: number;
  activeUnread: number;
  totalMaterials: number;
  totalInbox: number;
  totalLibrary: number;
  totalUnread: number;
};
type MaterialSummary = {
  id: number;
  title: string;
  status: 'INBOX' | 'PENDING_REVIEW' | 'COLLECTED' | 'ARCHIVED' | 'INVALID';
  score?: number | null;
  tagCount: number;
  hasComment: boolean;
  hasDescription: boolean;
};
type CompanionMode = 'quiet' | 'normal' | 'lively';

const WIDGET_WIDTH = 210;
const WIDGET_HEIGHT = 302;
const POSITION_KEY = 'idea-island-live2d-position';
const POSITION_VERSION_KEY = 'idea-island-live2d-position-version';
const POSITION_VERSION = 3;
const HIDDEN_KEY = 'idea-island-live2d-hidden';
const SCALE_KEY = 'idea-island-live2d-scale';
const MODE_KEY = 'idea-island-live2d-mode';
const BRIEF_DATE_KEY = 'idea-island-live2d-brief-date';
const ACHIEVEMENT_KEY = 'idea-island-live2d-achievement';
const STATIC_MASCOT_URL = '/mascot/xingxian-mascot.png';
const ANIMATED_MASCOT_URL = '/mascot/xingxian-mascot-animated.png';
const ANIMATION_DURATION_MS = 1700;
const REST_REMINDER_MS = 45 * 60 * 1000;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;
const SCALE_STEP = 0.1;
const ACHIEVEMENT_STEPS = [10, 30, 50, 100, 200, 500, 1000];

const idleLines = [
  '灵感频道已连接。',
  '要不要把刚刚的想法记录下来？',
  '我可以陪你整理碎片资料。',
  '点子先收进来，后面再慢慢沉淀。',
  '看到有价值的内容，先收进来不会亏。',
  '今天也可以给资料做一点点整理。',
  '标签不用一次想完，先分组就很有帮助。',
  '我在这里，随时帮你盯着灵感流。',
  '沐沐已进入低功耗陪伴模式。',
  '如果你在思考，我就先不打扰。',
  '灵感岛风平浪静，适合慢慢整理。',
  '当前频道很安静，适合做一点深度判断。',
  '资料不会自己长腿跑掉，慢慢来就好。',
  '我把小提示放在手边，需要时再递给你。',
  '今天的灵感缓存还很宽敞。',
  '不用一次处理完，先选一条也算开始。',
  '沐沐把灵感灯调成了柔和模式。',
  '现在适合安静浏览，不适合和焦虑吵架。',
  '资料还在原地，先把思路放慢一点。',
  '如果还没想好标签，可以先把资料留在这里。',
  '我正在巡逻收件箱，暂时没有异常。',
  '灵感岛小风吹过，适合做轻量整理。',
  '你可以先看标题，再决定要不要深入。',
  '不用马上给每条资料下结论。',
  '沐沐在旁边开着小夜灯。',
  '当前适合把碎片先放成一排。',
  '如果想法还模糊，先写关键词也可以。',
  '灵感不用抓太紧，给它一个位置就好。',
  '我会安静看着资料慢慢归位。',
  '等你准备好了，我们再继续下一条。',
  '现在没有紧急提示，只有一只认真待机的沐沐。',
  '如果不知道从哪里开始，就从最上面那条开始。',
];

const praiseLines = [
  '你已经在把零散信息变成自己的资料库了，很厉害。',
  '今天整理一点点，未来检索时就会轻松很多。',
  '能持续沉淀资料，本身就是很强的工作能力。',
  '这条资料被认真处理后，就不再只是路过的信息啦。',
  '你正在搭一座可复用的知识岛，稳稳推进就好。',
  '先收集、再判断、再沉淀，这个节奏很专业。',
  '每次给资料补上标签，都是在帮未来的自己省时间。',
  '已经做得不错了，剩下的慢慢整理也来得及。',
  '能把想法留下来的人，已经赢过了很多转瞬即逝。',
  '你的资料库不是堆东西，是在训练自己的判断力。',
  '这一步虽然小，但它真的会在以后帮到你。',
  '今天的你有在认真建设自己的系统，沐沐看见了。',
  '把复杂内容整理清楚，是很稀缺的能力。',
  '你不是在机械收藏，你是在给未来铺路。',
  '哪怕只处理一条，也比完全放过它更进一步。',
  '稳稳推进的人，通常最后走得最远。',
  '现在的每个标签，都是未来搜索时的一盏小灯。',
  '你已经不是被信息流推着走的人了。',
  '沐沐认证：今天的沉淀动作有效。',
  '能停下来判断价值，本身就很专业。',
  '你能持续打磨这个系统，说明你真的在认真对待自己的工作流。',
  '把信息变成可复用资料，是很有长期价值的习惯。',
  '你现在做的整理，会在某个着急的下午救你一次。',
  '能把资料归到正确位置，本身就是一种清晰感。',
  '这不是简单收藏，这是在训练复盘能力。',
  '你愿意给资料补上下文，这一点很难得。',
  '沐沐觉得你今天的推进非常稳。',
  '你在给未来的自己准备一张地图。',
  '能把判断写成评语，说明你不是只看热闹。',
  '你对资料价值的敏感度正在变强。',
  '今天又多了一点可沉淀的东西，真不错。',
  '你没有让好内容从指缝里漏掉。',
  '认真整理的人，迟早会拥有自己的资料优势。',
  '能坚持优化细节的人，通常也能做好长期项目。',
  '每次归档都是一次小型复盘。',
  '你已经在从信息消费者变成信息管理者。',
  '这个节奏很适合长期积累，不急但有效。',
  '你在建设的不是页面，是自己的判断系统。',
  '沐沐给你盖章：今日有效沉淀。',
  '哪怕只补一个标签，也是在减少未来的混乱。',
  '你已经做到了很多人最容易忽略的后半步。',
  '保持这个节奏，资料库会越来越像你的外脑。',
  '你正在把零散灵感变成可检索的资产。',
  '这一步处理得很像一个成熟的资料管理员。',
];

const cuteLines = [
  '沐沐的雷达响了：附近有一只野生好点子。',
  '如果灵感会发光，那这里现在有点亮。',
  '资料太多不要怕，沐沐先帮你眨眼压压惊。',
  '这个标签看起来很有精神，给它安排个位置吧。',
  '我不是在偷懒，我是在进行后台卖萌计算。',
  '点子先别跑，排队进收件箱。',
  '今天的资料也在努力变得井井有条。',
  '沐沐提醒：喝水、眨眼、保存灵感，三件事都重要。',
  '谁说我像唱歌的人鱼法师来着？',
  '一天，一天，贴近你的心❤~',
  '我们一起看月亮爬~上~来~',
  '你开心❤，我~安心~🤗',
  '沐沐刚才差点把灵感当点心吃掉。',
  '这条资料看起来像是会自己发光的那种。',
  '我已经摆好认真脸了，虽然看起来还是很可爱。',
  '如果资料会排队，现在它们应该在小声聊天。',
  '沐沐正在把混乱揉成一个小团子。',
  '咚咚，灵感快递到了，请签收一下。',
  '我没有走神，只是在和一个标签进行眼神交流。',
  '这个想法有点香，先放进资料库保鲜。',
  '沐沐今日任务：守住灵感，顺便卖萌。',
  '如果你点我，我就假装被召唤成功。',
  '刚刚那不是卡顿，是沐沐在蓄力。',
  '资料整理术，发动！效果是未来的你少找十分钟。',
  '沐沐把可爱值调低了一点，但好像没成功。',
  '当前灵感浓度：适合记录，不适合放跑。',
  '我给这个工作台盖一个小小的认真印章。',
  '沐沐刚刚偷偷给认真值加了一格。',
  '这条资料看起来有点想被收录。',
  '我听见标签在小声说：选我选我。',
  '灵感掉在地上了，沐沐帮你捡起来。',
  '如果资料会发朋友圈，它现在应该在等配图。',
  '沐沐的可爱缓存已刷新。',
  '刚才那一下是认真模式，不是卖萌模式。',
  '资料们正在排队等你点名。',
  '这不是拖延，是给想法一点发酵时间。',
  '沐沐申请把这个好点子收编。',
  '我把灵感装进小盒子里了，请贴标签。',
  '今天的工作台有一点点闪闪发亮。',
  '如果你犹豫了，沐沐就眨眼三次。',
  '这个主题好像在招手。',
  '资料的命运，就在你这一点之间。',
  '沐沐不是弹窗，沐沐是陪伴型提示。',
  '我刚刚认真看了一眼，感觉可以整理。',
  '这份资料正在等待一个漂亮的归宿。',
  '沐沐把混乱轻轻按住了。',
  '好内容出现时，空气都会小声叮一下。',
  '我已经把认真小帽子戴好了。',
  '这条灵感先别放走，它看起来很会跑。',
  '沐沐正在用可爱抵消信息过载。',
  '如果资料太多，我就负责在旁边保持镇定。',
  '这里有一份新鲜出炉的整理勇气。',
  '我感觉这个标签和这条资料有点缘分。',
  '沐沐今天也在认真当桌面小助手。',
  '资料整理完成一小步，可爱指数上升一小格。',
  '刚刚那句提示，是沐沐现想的。',
  '我不占内存，我只占一点点屏幕角落。',
];

const dailyLines = [
  '坐久了可以伸个懒腰，沐沐帮你守着这里。',
  '今天有没有好好吃饭？先照顾自己也很重要。',
  '天气不管怎么样，桌边放杯水总是没错的。',
  '眼睛有点累的话，可以看远处二十秒。',
  '如果今天已经很努力了，就允许自己慢一点。',
  '沐沐觉得，舒服的椅子也是生产力的一部分。',
  '工作间隙听首喜欢的歌，心情会顺一点。',
  '桌面乱一点也没关系，思路清楚就很好。',
  '先深呼吸一下，再继续处理手上的事情。',
  '今天的小目标可以小一点，但要真实完成。',
  '如果卡住了，换杯水回来也许就顺了。',
  '沐沐正在认真陪班，没有摸鱼，只是表情比较可爱。',
  '夜深的时候，别和困难硬碰硬，明天也可以继续。',
  '偶尔发呆不是浪费时间，脑子也需要缓存。',
  '今天也辛苦啦，能坐到这里已经很不容易。',
  '沐沐刚刚认真待机了三分钟，应该也算努力吧。',
  '如果今天有点累，那就先把事情切成小小一块。',
  '我想喝奶茶，但我只是一个桌面小助手。',
  '刚才那一下不是发呆，是在加载可爱能量。',
  '你忙你的，我在旁边安静冒泡。',
  '要是心情有点乱，可以先把桌上的东西摆正一点。',
  '沐沐宣布：现在适合奖励自己一口喜欢的东西。',
  '有些事情慢慢做也没关系，进度条还在往前走。',
  '我会乖乖待在这里，不突然打扰你的节奏。',
  '今天的你已经完成了很多看不见的小任务。',
  '如果不知道先做什么，就先做最容易开始的那一件。',
  '沐沐的今日状态：精神满格，偶尔想吃甜点。',
  '休息不是暂停人生，是给下一段路充电。',
  '你看起来需要一点点夸夸，沐沐已经准备好了。',
  '别急，很多事情都是先乱一下，才慢慢变清楚。',
  '如果可以的话，今天也请对自己温柔一点。',
  '沐沐正在练习成熟稳重，但可爱部分暂时藏不住。',
  '屏幕前的人类，请查收一份小小的元气补给。',
  '窗外不管亮不亮，先把手边这一点做好就很棒。',
  '今天适合给自己一点耐心，像等热饮变温一样。',
  '如果脑子有点吵，就先写下一句话。',
  '沐沐觉得，袜子舒服也会影响今天的战斗力。',
  '不要和空腹的大脑讲道理，它可能听不进去。',
  '今天可以允许自己普通一点，但别忘了继续走。',
  '有时候整理桌面，也是整理思路的外置动作。',
  '如果外面下雨，就把灵感当作室内小火苗。',
  '如果阳光很好，就把今天的心情晒一晒。',
  '沐沐在旁边小声说：你已经很努力了。',
  '可以先放一首背景音乐，让事情慢慢进入节奏。',
  '焦虑来的时候，先把任务缩小到能开始的尺寸。',
  '今天也许不完美，但可以很具体。',
  '如果你刚刚完成了一件小事，请在心里给自己点一下赞。',
  '沐沐会记得你认真工作的样子，虽然我没有摄像头。',
  '把肩膀放松一点，键盘不会自己逃走。',
  '今天的待办可以少一点，但完成感要真实一点。',
  '晚一点也没关系，慢慢把事情带回轨道。',
  '如果困了，就不要用意志力硬撑所有事情。',
  '生活不是永远冲刺，也需要可爱的缓冲区。',
  '如果窗外很安静，就让自己也安静一会儿。',
  '今天可以不用很燃，只要稳稳地做一点。',
  '把水杯放近一点，沐沐会比较放心。',
  '如果肩膀紧，就先把它放下来。',
  '遇到难题时，先给它起个名字。',
  '有些答案会在你休息之后自己靠近。',
  '不要让一整天都被一个卡点定义。',
  '能开始就已经比想象中更难得。',
  '今天的心情如果一般，也可以完成一般大小的任务。',
  '先把最吵的念头写下来，脑子会安静一点。',
  '如果今天很忙，别忘了给自己留一口气。',
  '沐沐觉得热饮和清单很搭。',
  '可以把大任务切成三块，先吃最小的一块。',
  '如果你刚好在发呆，那就发呆十秒再回来。',
  '生活偶尔需要空白，资料库也是。',
  '不想动的时候，先动一小下就可以。',
  '今天适合温柔推进，不适合猛烈责备自己。',
  '沐沐在心里给你放了一盏小灯。',
  '把手机放远一点，注意力会回来一点。',
  '如果眼睛干，就眨几下，不要硬撑。',
  '今天的你不需要满分，只需要真实在线。',
  '完成一件小事之后，可以停半分钟感受一下。',
  '如果觉得乱，先整理一个角落。',
  '沐沐负责提醒：你不是机器。',
  '慢一点不是落后，是在找合适的速度。',
  '如果今天不顺，就把目标改小一点。',
  '要不要站起来走两步？我帮你看着资料。',
  '好好吃饭这件事，也值得放进今日计划。',
  '如果正在深夜工作，请把屏幕亮度调舒服一点。',
  '今天也请不要用别人的进度惩罚自己。',
  '沐沐希望你能在忙完之后睡个好觉。',
  '刚开始混乱很正常，整理本来就是从混乱开始。',
  '如果脑袋发热，就先让它散散热。',
  '你可以先保存，不必立刻完美。',
  '有些灵感需要放一晚才知道价值。',
  '沐沐小声提醒：别忘了抬头看看远处。',
  '今天如果只做了一件重要的事，也值得肯定。',
  '把难题写下来，它就从脑子里搬到纸面上了。',
  '工作和生活都需要一点余量。',
  '如果很累，就别把自己逼成高性能模式。',
  '沐沐觉得你可以先喝口水再决定下一步。',
  '有时候暂停一下，反而能看见更清楚的路。',
  '你不是在落后，你是在整理自己的节奏。',
  '今天也许普通，但普通的一天也能积累东西。',
  '如果刚刚走神了，也可以很自然地回来。',
  '沐沐会在这里等你，不催。',
  '不要把所有窗口都开在脑子里。',
  '今天的烦躁可以先放在一边，不要让它指挥你。',
  '做完这一步，就允许自己休息一下。',
  '你可以先关掉一个不需要的页面。',
  '把手边的任务说清楚，压力会小一点。',
  '沐沐的生活建议：先照顾身体，再处理世界。',
  '如果今天很长，那就一段一段过。',
  '不用一直向前冲，也可以认真停靠。',
  '保持呼吸，保持保存。',
];

const actionLines = [
  '位置已经保存。',
  '这里视野不错。',
  '收到新的灵感信号。',
  '资料整理也可以很轻松。',
  '嗯，我动起来了。',
  '这里也不错，我先待一会儿。',
  '已经记住这个位置啦。',
  '收到，我换个角度陪你。',
  '这里离灵感更近一点。',
  '移动完成，沐沐重新入座。',
  '我在新位置继续值班。',
  '这个高度看起来刚刚好。',
  '缩放完成，可爱比例已更新。',
  '模式切换成功，沐沐会配合你的节奏。',
  '已经响应你的操作。',
  '收到，我马上调整状态。',
  '沐沐已完成一次小小配合。',
  '操作完成，我继续陪你看资料。',
  '明白，这个变化我记住了。',
  '我挪好了，不挡你的工作区。',
  '新的站位已确认。',
  '大小刚刚好，我会注意不抢镜。',
  '我会以当前模式继续陪伴。',
  '这次点击很有精神。',
  '沐沐收到指令，正在乖乖执行。',
  '互动成功，灵感值加一。',
  '我在这里，不会乱跑。',
  '按钮已触发，沐沐也精神了一下。',
  '这边已经处理好了。',
  '下一步交给你，旁边交给我。',
  '状态更新完成。',
  '沐沐准备好了。',
];

const tipLines = [
  '小提示：资料先放收件箱，确认有价值后再收录。',
  '小提示：评分可以代表复看优先级，不一定是内容质量。',
  '小提示：标签组适合表达维度，标签适合表达具体判断。',
  '小提示：搜索时可以把关键词、类型和标签组合起来。',
  '小提示：已归档资料适合放暂时不用、但以后可能回看的内容。',
  '小提示：评语写“为什么值得回看”，比复述内容更有用。',
  '小提示：单选标签组适合阶段，多选标签组适合特征。',
  '小提示：资料标题不必很长，但最好能让未来的你一眼看懂。',
  '小提示：图片资料如果有作者和来源，后续追溯会更稳。',
  '小提示：未读视图适合快速清理刚进入状态的资料。',
  '小提示：搜索不到时，可以先放宽状态或标签条件。',
  '小提示：高分资料不一定多，但应该值得优先复看。',
  '小提示：主题数量不用太多，先围绕真实用途建立。',
  '小提示：同一资料可以少量多维打标签，不要把标签变成正文。',
  '小提示：如果资料没有标题，先用一句能搜索到的短标题。',
  '小提示：来源平台和作者能帮助你之后判断可信度。',
  '小提示：评语可以写适用场景，比如“做方案时回看”。',
  '小提示：不要把所有标签都做成必选，必选越多越容易卡住流程。',
  '小提示：归档不是删除，是让资料暂时退出主工作流。',
  '小提示：资料失效后可以先放着，确认无用再永久删除。',
  '小提示：图片资料最好补一行描述，不然以后只看缩略图容易忘。',
  '小提示：搜索关键词可以试试标题里的核心名词。',
  '小提示：一个主题如果太大，可以拆成两个更具体的主题。',
  '小提示：标签颜色适合表达分组，不需要每个标签都很醒目。',
  '小提示：未评分资料在评分排序里会靠后，可以慢慢补。',
  '小提示：如果一条资料没价值，标记失效比勉强收录更干净。',
  '小提示：收件箱是缓冲区，不是最终资料库。',
  '小提示：描述适合写内容摘要，评语适合写你的判断。',
  '小提示：原始内容保留事实，评语保留观点。',
  '小提示：给资料打分时，可以问自己“我会不会再打开它”。',
  '小提示：常用标签应该短，少见标签可以更具体。',
  '小提示：如果筛选结果太少，先取消一个标签条件。',
  '小提示：定期看一下高分资料，会比重新刷信息流更有效。',
  '小提示：主题设置最好先服务当前工作，不必追求一开始完美。',
  '小提示：同一标签组里的标签应该是同一类问题的答案。',
  '小提示：资料越多，前期标签设计越重要。',
  '小提示：搜索页适合找资料，资料库适合复看资料。',
  '小提示：如果内容来自视频，评语可以记录最值得看的片段原因。',
];

const greetingLines = [
  '欢迎回来，今天也来整理一点灵感吧。',
  '工作台已就绪，我会安静陪着你。',
  '灵感岛已连接，先从最重要的资料开始吧。',
  '你回来啦，我已经把看板位置站好了。',
  '今天也请把有价值的东西留给未来的自己。',
  '沐沐上线，开始陪你守住灵感。',
  '欢迎登岛，今天的资料也会慢慢变清楚。',
  '先不用着急，我们一条一条来。',
  '沐沐已到岗，今天也一起慢慢整理。',
  '欢迎回来，我把灵感岛打扫了一下。',
  '今天从哪条资料开始呢？',
  '工作台已经醒了，沐沐也醒了。',
  '回来得正好，有些资料在等你看看。',
  '今天的第一步，可以很小但要真实。',
  '欢迎回来，先不用急着进入高强度。',
  '我已经准备好陪你处理资料啦。',
  '灵感岛今日营业中。',
  '又见面了，今天也请多指教。',
  '先看一眼当前主题，再决定从哪里开始。',
  '沐沐上线完成，等待你的第一条指令。',
];

const hoverLines = [
  '我在。',
  '需要我给点整理建议吗？',
  '点我可以换一句提示。',
  '双击我也可以互动哦。',
  '靠近一点也没关系。',
  '沐沐待命中。',
  '想听一句鼓励吗？',
  '我刚刚有乖乖安静。',
  '这里可以拖动我换位置。',
  '今天也要注意休息。',
  '我听见鼠标靠近了。',
  '你是不是想点我一下？',
  '沐沐正在保持可点击状态。',
  '要不要来一句今日提示？',
  '我可以被拖到不挡路的地方。',
  '靠近我会出现小按钮。',
  '如果我挡住内容，可以把我挪开。',
  '我会努力不影响你看资料。',
  '点一下也许会有新句子。',
  '沐沐准备发表一点点看法。',
  '我在角落认真营业。',
  '需要一点元气补给吗？',
  '我不会突然跳出来，除非你叫我。',
  '这里是沐沐的临时工作站。',
];

const pageLines: Record<string, string[]> = {
  收件箱: ['这里适合处理刚收进来的资料。', '未读资料可以先快速扫一遍，再决定是否收录。', '收件箱不用追求完美，先判断去留就好。', '刚进来的资料先别急着分类，扫一眼价值更重要。', '如果一条资料暂时判断不了，可以先留在收件箱。', '收件箱里的资料适合快速处理，不要让它堆太久。', '这里是资料进入系统的第一站。', '先补标题和来源，就已经比散落在浏览器里强很多。'],
  资料库: ['资料库适合回看和沉淀。', '按评分或最近加入排序，能更快找到值得复看的内容。', '这里是已经筛过一遍的内容，适合慢慢复用。', '如果资料库越来越厚，说明你在持续积累判断。', '资料库里的内容适合做复盘、写作和方案参考。', '已收录适合近期回看，已归档适合长期安放。', '看到高分资料时，可以顺手补一句更具体的评语。', '资料库不是越多越好，是越能找回来越好。'],
  搜索: ['搜索时可以把关键词、类型和标签组合起来。', '标签条件越清晰，结果越容易收敛。', '搜不到时先减少条件，再逐步加回来。', '搜索页适合把散落的线索重新串起来。', '评分优先适合找最值得复看的内容。', '最近更新适合找刚刚修改过的资料。', '如果关键词太具体，可以先换成更宽的词。', '搜索结果里也可以继续打开详情检查上下文。'],
  主题设置: ['主题下面是标签组，标签组下面才是标签。', '单选组适合阶段，多选组适合特征。', '标签组颜色不用太抢眼，能帮助识别就够了。', '一个好主题，应该服务于你真实会回看的问题。', '新增标签前，可以先想它属于哪个判断维度。', '删除标签前，最好确认它不会影响已有资料的检索习惯。', '标签组太多会增加整理负担，够用就好。', '主题设置越贴近工作流，后续整理越轻松。'],
  统计: ['统计页会更适合观察长期沉淀情况。', '数据积累起来后，这里会更有价值。', '统计不是为了压力，是为了看见长期变化。', '如果数字在增长，说明你的资料系统正在成形。', '统计页适合观察哪些主题最活跃。', '如果收件箱长期很高，可以安排一次清理。', '沉淀比例可以反映资料处理是否顺畅。', '统计数字只是参考，真正重要的是资料能不能帮到你。'],
  灵感助手: ['灵感助手还在开发中，我先陪你值班。', '以后这里可以围绕资料直接对话。', '等助手长大一点，就能一起做资料总结了。', '这里以后会更像一个能讨论资料的工作伙伴。', '未来可以在这里问资料之间的关联。', '等 AI 能力接入后，我也想帮你做摘要和复盘。', '这里会适合把资料转成行动建议。', '现在先把资料沉淀好，后续对话才更有价值。'],
  个人中心: ['这里可以调整主题色、明暗模式和界面风格。', '外观设置会被记住，下次打开还会保留。', '把界面调舒服一点，也是在照顾使用体验。', '个人中心适合检查账号状态和最近更新。', '如果长时间使用，暗黑模式会更柔和一点。', '界面风格可以按心情切换，工作流保持不变。', '更新日志放在这里，方便回看最近变化。', '个人资料不用复杂，能表达当前使用状态就够了。'],
  失效资料: ['失效资料放在这里，避免干扰正常资料库。', '需要时可以把资料恢复回来继续整理。', '这里适合做清理，不用经常打开。', '确定不再需要的资料，可以在这里彻底处理。', '失效资料不应该影响正常标签维护。', '如果资料只是暂时不可用，可以先不永久删除。', '这里更像回收站，保持低频使用就好。', '清理失效资料可以让资料库更干净。'],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomLine<T>(lines: T[]) {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0];
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，整理资料可以轻一点。';
  if (hour < 11) return '早上好，适合先处理最重要的资料。';
  if (hour < 14) return '午间也可以做一点轻整理。';
  if (hour < 18) return '下午好，适合把零散资料归类一下。';
  return '晚上好，回看资料时别太累。';
}

function workStatusLines(summary?: WorkspaceSummary) {
  if (!summary) return ['我还在读取你的工作台近况。'];
  const topicName = summary.topicName || '当前主题';
  const lines = [
    `现在共有 ${summary.topicCount} 个主题，累计 ${summary.totalMaterials} 条资料。`,
    `${topicName} 里有 ${summary.activeInbox} 条收件箱资料、${summary.activeLibrary} 条已沉淀资料。`,
    `全部主题里还有 ${summary.totalInbox} 条资料等待处理。`,
    `资料库已经沉淀 ${summary.totalLibrary} 条内容，回看时会很方便。`,
  ];
  if (summary.activeUnread > 0) {
    lines.push(`${topicName} 还有 ${summary.activeUnread} 条未读资料，可以先快速扫一遍。`);
  }
  if (summary.totalUnread > 0) {
    lines.push(`全部工作区合计 ${summary.totalUnread} 条未读资料，慢慢处理就好。`);
  }
  if (summary.totalMaterials === 0) {
    lines.push('资料库还很清爽，可以从第一条链接或图片开始收集。');
  }
  if (summary.totalInbox === 0 && summary.totalMaterials > 0) {
    lines.push('当前待处理资料不多，很适合做一轮复盘。');
  }
  return lines;
}

function dailyBriefLine(summary?: WorkspaceSummary) {
  if (!summary) return '今天的工作台还在加载，沐沐稍后再汇报。';
  const topicName = summary.topicName || '当前主题';
  return `今日简报：${topicName} 有 ${summary.activeInbox} 条待处理、${summary.activeLibrary} 条已沉淀，全部主题还有 ${summary.totalUnread} 条未读。`;
}

function materialAdviceLines(material?: MaterialSummary) {
  if (!material) return ['选中一条资料后，沐沐可以给你一点处理建议。'];
  const title = material.title ? `《${material.title.slice(0, 18)}${material.title.length > 18 ? '...' : ''}》` : '这条资料';
  const lines: string[] = [];
  if (material.status === 'INBOX' || material.status === 'PENDING_REVIEW') {
    lines.push(`${title} 还在收件箱，可以补上评分、评语和标签后再收录。`);
    if (!material.hasComment) lines.push(`${title} 还没有评语，写一句复看理由会很有用。`);
    if (!material.hasDescription) lines.push(`${title} 还缺少描述，可以补一句它为什么值得保留。`);
  }
  if (material.status === 'COLLECTED') {
    lines.push(`${title} 已经收录，可以继续补标签，或者评估是否归档。`);
    if (material.score == null) lines.push(`${title} 还没有评分，可以给它一个复看优先级。`);
    if (!material.hasComment) lines.push(`${title} 已收录但没有评语，未来回看时可能不太好判断价值。`);
  }
  if (material.status === 'ARCHIVED') {
    lines.push(`${title} 已归档，适合当作长期资料安静沉淀。`);
  }
  if (material.status === 'INVALID') {
    lines.push(`${title} 当前已失效，需要时可以恢复后重新整理。`);
  }
  if (material.tagCount === 0 && material.status !== 'INVALID') {
    lines.push(`${title} 还没有用户标签，补一个标签会更容易被搜到。`);
  }
  return lines;
}

function modeLabel(mode: CompanionMode) {
  if (mode === 'quiet') return '安静';
  if (mode === 'lively') return '活泼';
  return '标准';
}

function modeInterval(mode: CompanionMode) {
  if (mode === 'quiet') return 36_000;
  if (mode === 'lively') return 12_000;
  return 20_000;
}

function nextMode(mode: CompanionMode): CompanionMode {
  if (mode === 'normal') return 'lively';
  if (mode === 'lively') return 'quiet';
  return 'normal';
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is optional for this decorative widget.
  }
}

function widgetWidth(scale: number) {
  return WIDGET_WIDTH * scale;
}

function widgetHeight(scale: number) {
  return WIDGET_HEIGHT * scale;
}

function defaultPosition(scale = 1): Point {
  return {
    x: 24,
    y: Math.max(12, window.innerHeight - widgetHeight(scale) - 54),
  };
}

function FallbackCharacter() {
  return (
    <div className="live2d-fallback-character" aria-hidden="true">
      <div className="anime-character">
        <span className="anime-hair anime-hair-back" />
        <span className="anime-face" />
        <span className="anime-bang bang-left" />
        <span className="anime-bang bang-right" />
        <span className="anime-eye eye-left" />
        <span className="anime-eye eye-right" />
        <span className="anime-blush blush-left" />
        <span className="anime-blush blush-right" />
        <span className="anime-smile" />
        <span className="anime-neck" />
        <span className="anime-body" />
        <span className="anime-collar collar-left" />
        <span className="anime-collar collar-right" />
        <span className="anime-arm arm-left" />
        <span className="anime-arm arm-right" />
        <span className="anime-tablet" />
        <span className="anime-skirt" />
        <span className="anime-leg leg-left" />
        <span className="anime-leg leg-right" />
      </div>
    </div>
  );
}

export function XingxianLive2DWidget({
  viewLabel,
  captureOpen,
  noticeText,
  workspaceSummary,
  materialSummary,
}: {
  viewLabel?: string;
  captureOpen?: boolean;
  noticeText?: string;
  workspaceSummary?: WorkspaceSummary;
  materialSummary?: MaterialSummary;
}) {
  const bubbleTimerRef = useRef<number | undefined>(undefined);
  const animationTimerRef = useRef<number | undefined>(undefined);
  const hoverTimerRef = useRef<number | undefined>(undefined);
  const speakingRef = useRef(false);
  const lastViewRef = useRef<string | undefined>(viewLabel);
  const lastNoticeRef = useRef<string | undefined>(noticeText);
  const lastUnreadRef = useRef<number | undefined>(workspaceSummary?.activeUnread);
  const lastMaterialRef = useRef<number | undefined>(materialSummary?.id);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const [bubble, setBubble] = useState('我是沐沐，灵感岛看板助手。');
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [hidden, setHidden] = useState(() => safeRead(HIDDEN_KEY, false));
  const [mascotFailed, setMascotFailed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [mode, setMode] = useState<CompanionMode>(() => safeRead(MODE_KEY, 'normal' as CompanionMode));
  const [scale, setScaleState] = useState(() => clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE));
  const [position, setPositionState] = useState<Point>(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const initialScale = clamp(safeRead(SCALE_KEY, 1), MIN_SCALE, MAX_SCALE);
    const positionVersion = safeRead(POSITION_VERSION_KEY, 0);
    if (positionVersion < POSITION_VERSION) {
      const next = defaultPosition(initialScale);
      safeWrite(POSITION_KEY, next);
      safeWrite(POSITION_VERSION_KEY, POSITION_VERSION);
      return next;
    }
    return safeRead(POSITION_KEY, defaultPosition(initialScale));
  });

  const setPosition = useCallback((next: Point) => {
    const safe = {
      x: clamp(next.x, 8, Math.max(8, window.innerWidth - widgetWidth(scale) - 8)),
      y: clamp(next.y, 8, Math.max(8, window.innerHeight - widgetHeight(scale) - 8)),
    };
    setPositionState(safe);
    safeWrite(POSITION_KEY, safe);
    safeWrite(POSITION_VERSION_KEY, POSITION_VERSION);
  }, [scale]);

  const setScale = useCallback((next: number) => {
    const safe = Math.round(clamp(next, MIN_SCALE, MAX_SCALE) * 10) / 10;
    setScaleState(safe);
    safeWrite(SCALE_KEY, safe);
    setPositionState((current) => {
      const nextPosition = {
        x: clamp(current.x, 8, Math.max(8, window.innerWidth - widgetWidth(safe) - 8)),
        y: clamp(current.y, 8, Math.max(8, window.innerHeight - widgetHeight(safe) - 8)),
      };
      safeWrite(POSITION_KEY, nextPosition);
      return nextPosition;
    });
  }, []);

  const showSpeech = useCallback((text: string, duration = 3600) => {
    speakingRef.current = true;
    setBubble(text);
    setBubbleVisible(true);
    setAnimating(true);
    setAnimationKey((current) => current + 1);
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    bubbleTimerRef.current = window.setTimeout(() => {
      speakingRef.current = false;
      setBubbleVisible(false);
    }, duration);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  const speak = useCallback((text: string, duration = 3600, force = false) => {
    if (speakingRef.current && !force) {
      return;
    }
    showSpeech(text, duration);
  }, [showSpeech]);

  const playAnimation = useCallback(() => {
    setAnimating(true);
    setAnimationKey((current) => current + 1);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_DURATION_MS);
  }, []);

  const resetPosition = useCallback(() => {
    setPosition(defaultPosition(scale));
    playAnimation();
    speak('已经回到默认位置。', 3600, true);
  }, [playAnimation, scale, setPosition, speak]);

  const speakTip = useCallback(() => {
    const groups = [
      tipLines,
      praiseLines,
      cuteLines,
      dailyLines,
      workStatusLines(workspaceSummary),
      materialAdviceLines(materialSummary),
    ];
    speak(randomLine(randomLine(groups)), 5600, true);
  }, [materialSummary, speak, workspaceSummary]);

  const onWidgetEnter = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      speak(randomLine(hoverLines), 3000, true);
    }, 700);
  }, [speak]);

  const onWidgetLeave = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(() => () => {
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (animationTimerRef.current) window.clearTimeout(animationTimerRef.current);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    speakingRef.current = false;
  }, []);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setTimeout(() => {
      const today = todayKey();
      if (safeRead(BRIEF_DATE_KEY, '') !== today && workspaceSummary) {
        safeWrite(BRIEF_DATE_KEY, today);
        speak(`${randomLine(greetingLines)}${timeGreeting()} ${dailyBriefLine(workspaceSummary)}`, 7200);
        return;
      }
      speak(`${randomLine(greetingLines)}${timeGreeting()}`, 5200);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden) return;
    const timer = window.setInterval(() => {
      const groups = [
        idleLines,
        praiseLines,
        cuteLines,
        dailyLines,
        workStatusLines(workspaceSummary),
        materialAdviceLines(materialSummary),
      ];
      speak(randomLine(randomLine(groups)));
    }, modeInterval(mode));
    return () => window.clearInterval(timer);
  }, [hidden, materialSummary, mode, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || mode === 'quiet') return;
    const timer = window.setInterval(() => {
      speak(randomLine([
        '休息提醒：起来活动一下，眼睛也看看远处。',
        '沐沐提醒你喝一口水，再回来继续也不迟。',
        '坐太久啦，肩颈可以轻轻放松一下。',
      ]), 5600);
    }, REST_REMINDER_MS);
    return () => window.clearInterval(timer);
  }, [hidden, mode, speak]);

  useEffect(() => {
    if (hidden || !viewLabel || lastViewRef.current === viewLabel) return;
    lastViewRef.current = viewLabel;
    const lines = pageLines[viewLabel] ?? [`现在位于${viewLabel}。`];
    speak(randomLine(lines), 4400, true);
  }, [hidden, speak, viewLabel]);

  useEffect(() => {
    if (hidden || !workspaceSummary) return;
    const currentUnread = workspaceSummary.activeUnread;
    const previousUnread = lastUnreadRef.current;
    lastUnreadRef.current = currentUnread;
    if (previousUnread === undefined || currentUnread <= 0 || currentUnread === previousUnread) return;
    speak(`${workspaceSummary.topicName || '当前主题'} 现在有 ${currentUnread} 条未读资料，点开资料后我会帮你记成已读。`, 5600);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || !materialSummary || lastMaterialRef.current === materialSummary.id) return;
    lastMaterialRef.current = materialSummary.id;
    const lines = materialAdviceLines(materialSummary);
    speak(randomLine(lines), 5600, true);
  }, [hidden, materialSummary, speak]);

  useEffect(() => {
    if (hidden || !workspaceSummary) return;
    const reached = ACHIEVEMENT_STEPS.filter((step) => workspaceSummary.totalMaterials >= step).pop();
    if (!reached) return;
    const saved = safeRead(ACHIEVEMENT_KEY, 0);
    if (saved >= reached) return;
    safeWrite(ACHIEVEMENT_KEY, reached);
    speak(`小成就达成：资料库累计 ${workspaceSummary.totalMaterials} 条资料啦，沐沐给你认真鼓掌。`, 6600);
  }, [hidden, speak, workspaceSummary]);

  useEffect(() => {
    if (hidden || !captureOpen) return;
    speak('正在采集资料。带星号的是必填项，图片也可以直接粘贴。', 5200);
  }, [captureOpen, hidden, speak]);

  useEffect(() => {
    if (hidden || !noticeText || lastNoticeRef.current === noticeText) return;
    lastNoticeRef.current = noticeText;
    speak(`${noticeText}。我已经看到结果啦。`, 4200);
  }, [hidden, noticeText, speak]);

  useEffect(() => {
    const handleResize = () => setPosition(position);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, setPosition]);

  const onDragPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    playAnimation();
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  }, [playAnimation, position.x, position.y]);

  const onDragPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    setPosition({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
  }, [setPosition]);

  const onDragPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.dragging = false;
    playAnimation();
    speak(randomLine(actionLines), 3600, true);
  }, [playAnimation, speak]);

  const style = useMemo<CSSProperties>(() => ({
    width: widgetWidth(scale),
    height: widgetHeight(scale),
    left: position.x,
    top: position.y,
  }), [position.x, position.y, scale]);
  const bubbleOnRight = position.x < 360;

  if (hidden) {
    return (
      <button
        type="button"
        className="live2d-launcher"
        onClick={() => {
          setHidden(false);
          safeWrite(HIDDEN_KEY, false);
          playAnimation();
          speak('我回来啦。', 3600, true);
        }}
      >
        沐沐
      </button>
    );
  }

  return (
    <section
      className={`live2d-widget ${bubbleOnRight ? 'bubble-right' : ''}`}
      style={style}
      aria-label="沐沐 GIF 看板娘"
      onMouseEnter={onWidgetEnter}
      onMouseLeave={onWidgetLeave}
      onDoubleClick={() => {
        playAnimation();
        speakTip();
      }}
    >
      <div
        className="live2d-drag-handle"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        title="拖拽移动沐沐"
      >
        <span className="live2d-dot" />
        <span className="live2d-name">沐沐</span>
      </div>

      <div className={`live2d-bubble ${bubbleVisible ? 'is-visible' : ''}`}>{bubble}</div>

      <div className="live2d-toolbar" aria-label="沐沐操作">
        <button
          type="button"
          onClick={() => {
            playAnimation();
            speakTip();
          }}
          title="整理建议"
        >
          ✦
        </button>
        <button
          type="button"
          onClick={() => {
            const next = nextMode(mode);
            setMode(next);
            safeWrite(MODE_KEY, next);
            playAnimation();
            speak(`陪伴模式切换为${modeLabel(next)}。`, 3600, true);
          }}
          title={`陪伴模式：${modeLabel(mode)}`}
        >
          {mode === 'quiet' ? '静' : mode === 'lively' ? '跃' : '常'}
        </button>
        <button type="button" onClick={resetPosition} title="回到默认位置">⌂</button>
        <button
          type="button"
          disabled={scale <= MIN_SCALE}
          onClick={() => {
            setScale(scale - SCALE_STEP);
            playAnimation();
            speak('我变小一点，少挡住你的资料。', 3600, true);
          }}
          title="缩小"
        >
          -
        </button>
        <button
          type="button"
          disabled={scale >= MAX_SCALE}
          onClick={() => {
            setScale(scale + SCALE_STEP);
            playAnimation();
            speak('我变大一点，这样更容易看到我。', 3600, true);
          }}
          title="放大"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            speak('我先收起来，需要时右下角叫我。', 3600, true);
            setHidden(true);
            safeWrite(HIDDEN_KEY, true);
          }}
          title="隐藏"
        >
          ×
        </button>
      </div>

      {mascotFailed ? (
        <FallbackCharacter />
      ) : (
        <img
          className="live2d-mascot-image"
          key={animating ? `animated-${animationKey}` : 'static'}
          src={animating ? ANIMATED_MASCOT_URL : STATIC_MASCOT_URL}
          alt=""
          draggable={false}
          onClick={() => {
            playAnimation();
            speak(randomLine([...actionLines, ...tipLines, ...praiseLines, ...cuteLines, ...dailyLines, ...materialAdviceLines(materialSummary)]), 3600, true);
          }}
          onError={() => setMascotFailed(true)}
        />
      )}
    </section>
  );
}
