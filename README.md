# spider-zhihu-hot

爬取知乎热榜

## 使用指南

1. 登录知乎
2. 浏览器安装 Cookie Editor 插件
3. 之后使用 Cookie Editor `export` cookie 到 `./env/cookies.json`
4. pnpm start

## 结果示例

```json
[
  {
    "href": "https://www.zhihu.com/question/1899104401064436977",
    "title": "金扫帚奖揭晓，陆川《749 局》横扫奖项，包贝尔获影帝，如何看待这一奖项？对导演及演员有何实际影响？",
    "image": "https://picx.zhimg.com/80/v2-b8d4ee3fced1d53a6be449391b05c841_400x224.png"
  },
  {
    "href": "https://www.zhihu.com/question/274890065",
    "title": "《大明王朝 1566》中，嘉靖为什么突然因为别人叫吕芳「老祖宗」而大发雷霆？",
    "image": "https://pic1.zhimg.com/80/v2-8344883dd39dbdbf61efbb60d300406a_400x224.webp?source=1def8aca"
  },
  {
    "href": "https://www.zhihu.com/question/1899041693380080715",
    "title": "去年我国信用卡「缩水」4000 万张，你「销卡」了吗？如何解读这一趋势？",
    "image": "https://pic1.zhimg.com/80/v2-5d230f218c962f40511b96c536f4b58a_400x224.webp?source=1def8aca"
  },
  {
    "href": "https://www.zhihu.com/question/1899207574949160013",
    "title": "深航延误乘客禁出客舱 8 小时无赔偿，有乘客出现身体不适，为何不让乘客下飞机？民航相关规定是怎样的？",
    "image": "https://pica.zhimg.com/80/v2-0df3388bf40c667aa9867f7990dad000_400x224.png"
  },
  {
    "href": "https://www.zhihu.com/question/1896726316402840869",
    "title": "人类为什么要进化出这么长的睡眠时间？",
    "image": "https://picx.zhimg.com/80/v2-1a25e8790df7b3acbcb7cbd13afe04d9_400x224.png"
  }
]
```