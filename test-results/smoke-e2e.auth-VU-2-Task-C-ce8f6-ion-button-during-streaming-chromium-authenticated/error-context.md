# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke-e2e.auth.spec.ts >> VU-2: Task Creation & Chat >> task page has stop generation button during streaming
- Location: e2e/smoke-e2e.auth.spec.ts:201:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to main content" [ref=e3] [cursor=pointer]:
    - /url: "#main-content"
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - navigation "Main navigation" [ref=e5]:
      - generic [ref=e6]:
        - link "Manus manus" [ref=e7] [cursor=pointer]:
          - /url: /
          - img "Manus" [ref=e8]: 🐾
          - generic [ref=e9]: manus
        - button "Close sidebar" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
      - generic [ref=e14]:
        - link "3,300 credits" [ref=e15] [cursor=pointer]:
          - /url: /billing
          - img [ref=e16]
          - generic [ref=e21]: 3,300
          - generic [ref=e22]: credits
        - generic "Current model tier" [ref=e23]:
          - img [ref=e24]
          - generic [ref=e26]: v2.0
      - generic [ref=e28]:
        - img [ref=e29]
        - textbox "Search tasks & messages..." [ref=e32]
        - button "Date range filter" [ref=e34] [cursor=pointer]:
          - img [ref=e35]
      - generic [ref=e38]:
        - generic [ref=e39]: Tasks
        - button "Filter tasks" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
      - button "New task ⌘K" [ref=e45] [cursor=pointer]:
        - img
        - text: New task
        - generic [ref=e46]: ⌘K
      - region "Task list" [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]:
            - 'button "E2E: Write a long essay about AI just now" [ref=e50] [cursor=pointer]':
              - generic [ref=e54]:
                - paragraph [ref=e56]: "E2E: Write a long essay about AI"
                - generic [ref=e58]: just now
            - button "Delete task" [ref=e60] [cursor=pointer]:
              - img [ref=e61]
          - generic [ref=e64]:
            - 'button "E2E: Voice test just now In progress" [ref=e65] [cursor=pointer]':
              - generic [ref=e69]:
                - paragraph [ref=e71]: "E2E: Voice test"
                - generic [ref=e72]:
                  - generic [ref=e73]: just now
                  - generic [ref=e74]: In progress
            - button "Delete task" [ref=e76] [cursor=pointer]:
              - img [ref=e77]
          - generic [ref=e80]:
            - 'button "E2E: Mode test just now In progress" [ref=e81] [cursor=pointer]':
              - generic [ref=e85]:
                - paragraph [ref=e87]: "E2E: Mode test"
                - generic [ref=e88]:
                  - generic [ref=e89]: just now
                  - generic [ref=e90]: In progress
            - button "Delete task" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
          - generic [ref=e96]:
            - 'button "E2E: Share test just now" [ref=e97] [cursor=pointer]':
              - generic [ref=e101]:
                - paragraph [ref=e103]: "E2E: Share test"
                - generic [ref=e105]: just now
            - button "Delete task" [ref=e107] [cursor=pointer]:
              - img [ref=e108]
          - generic [ref=e111]:
            - 'button "E2E: Workspace test just now In progress" [ref=e112] [cursor=pointer]':
              - generic [ref=e116]:
                - paragraph [ref=e118]: "E2E: Workspace test"
                - generic [ref=e119]:
                  - generic [ref=e120]: just now
                  - generic [ref=e121]: In progress
            - button "Delete task" [ref=e123] [cursor=pointer]:
              - img [ref=e124]
          - generic [ref=e127]:
            - 'button "E2E: Hello test just now In progress" [ref=e128] [cursor=pointer]':
              - generic [ref=e132]:
                - paragraph [ref=e134]: "E2E: Hello test"
                - generic [ref=e135]:
                  - generic [ref=e136]: just now
                  - generic [ref=e137]: In progress
            - button "Delete task" [ref=e139] [cursor=pointer]:
              - img [ref=e140]
          - generic [ref=e143]:
            - button "France Capital Question just now" [ref=e144] [cursor=pointer]:
              - generic [ref=e148]:
                - paragraph [ref=e150]: France Capital Question
                - generic [ref=e152]: just now
            - button "Delete task" [ref=e154] [cursor=pointer]:
              - img [ref=e155]
          - generic [ref=e158]:
            - 'button "E2E: Simple math 3+3 just now In progress" [ref=e159] [cursor=pointer]':
              - generic [ref=e163]:
                - paragraph [ref=e165]: "E2E: Simple math 3+3"
                - generic [ref=e166]:
                  - generic [ref=e167]: just now
                  - generic [ref=e168]: In progress
            - button "Delete task" [ref=e170] [cursor=pointer]:
              - img [ref=e171]
          - generic [ref=e174]:
            - 'button "E2E: What is 2+2? just now In progress" [ref=e175] [cursor=pointer]':
              - generic [ref=e179]:
                - paragraph [ref=e181]: "E2E: What is 2+2?"
                - generic [ref=e182]:
                  - generic [ref=e183]: just now
                  - generic [ref=e184]: In progress
            - button "Delete task" [ref=e186] [cursor=pointer]:
              - img [ref=e187]
          - generic [ref=e190]:
            - 'button "E2E: Model selector test 23m ago In progress" [ref=e191] [cursor=pointer]':
              - generic [ref=e195]:
                - paragraph [ref=e197]: "E2E: Model selector test"
                - generic [ref=e198]:
                  - generic [ref=e199]: 23m ago
                  - generic [ref=e200]: In progress
            - button "Delete task" [ref=e202] [cursor=pointer]:
              - img [ref=e203]
          - generic [ref=e206]:
            - 'button "E2E: Disclaimer test 23m ago In progress" [ref=e207] [cursor=pointer]':
              - generic [ref=e211]:
                - paragraph [ref=e213]: "E2E: Disclaimer test"
                - generic [ref=e214]:
                  - generic [ref=e215]: 23m ago
                  - generic [ref=e216]: In progress
            - button "Delete task" [ref=e218] [cursor=pointer]:
              - img [ref=e219]
          - generic [ref=e222]:
            - 'button "E2E: Branch test 24m ago In progress" [ref=e223] [cursor=pointer]':
              - generic [ref=e227]:
                - paragraph [ref=e229]: "E2E: Branch test"
                - generic [ref=e230]:
                  - generic [ref=e231]: 24m ago
                  - generic [ref=e232]: In progress
            - button "Delete task" [ref=e234] [cursor=pointer]:
              - img [ref=e235]
          - generic [ref=e238]:
            - 'button "E2E: Write a long essay about AI 24m ago In progress" [ref=e239] [cursor=pointer]':
              - generic [ref=e243]:
                - paragraph [ref=e245]: "E2E: Write a long essay about AI"
                - generic [ref=e246]:
                  - generic [ref=e247]: 24m ago
                  - generic [ref=e248]: In progress
            - button "Delete task" [ref=e250] [cursor=pointer]:
              - img [ref=e251]
          - generic [ref=e254]:
            - 'button "E2E: Voice test 24m ago In progress" [ref=e255] [cursor=pointer]':
              - generic [ref=e259]:
                - paragraph [ref=e261]: "E2E: Voice test"
                - generic [ref=e262]:
                  - generic [ref=e263]: 24m ago
                  - generic [ref=e264]: In progress
            - button "Delete task" [ref=e266] [cursor=pointer]:
              - img [ref=e267]
          - generic [ref=e270]:
            - 'button "E2E: Mode test 24m ago In progress" [ref=e271] [cursor=pointer]':
              - generic [ref=e275]:
                - paragraph [ref=e277]: "E2E: Mode test"
                - generic [ref=e278]:
                  - generic [ref=e279]: 24m ago
                  - generic [ref=e280]: In progress
            - button "Delete task" [ref=e282] [cursor=pointer]:
              - img [ref=e283]
          - generic [ref=e286]:
            - 'button "E2E: Share test 24m ago In progress" [ref=e287] [cursor=pointer]':
              - generic [ref=e291]:
                - paragraph [ref=e293]: "E2E: Share test"
                - generic [ref=e294]:
                  - generic [ref=e295]: 24m ago
                  - generic [ref=e296]: In progress
            - button "Delete task" [ref=e298] [cursor=pointer]:
              - img [ref=e299]
          - generic [ref=e302]:
            - 'button "E2E: Workspace test 24m ago In progress" [ref=e303] [cursor=pointer]':
              - generic [ref=e307]:
                - paragraph [ref=e309]: "E2E: Workspace test"
                - generic [ref=e310]:
                  - generic [ref=e311]: 24m ago
                  - generic [ref=e312]: In progress
            - button "Delete task" [ref=e314] [cursor=pointer]:
              - img [ref=e315]
          - generic [ref=e318]:
            - 'button "E2E: Hello test 24m ago In progress" [ref=e319] [cursor=pointer]':
              - generic [ref=e323]:
                - paragraph [ref=e325]: "E2E: Hello test"
                - generic [ref=e326]:
                  - generic [ref=e327]: 24m ago
                  - generic [ref=e328]: In progress
            - button "Delete task" [ref=e330] [cursor=pointer]:
              - img [ref=e331]
          - generic [ref=e334]:
            - 'button "E2E: Simple math 3+3 24m ago In progress" [ref=e335] [cursor=pointer]':
              - generic [ref=e339]:
                - paragraph [ref=e341]: "E2E: Simple math 3+3"
                - generic [ref=e342]:
                  - generic [ref=e343]: 24m ago
                  - generic [ref=e344]: In progress
            - button "Delete task" [ref=e346] [cursor=pointer]:
              - img [ref=e347]
          - generic [ref=e350]:
            - button "Identify France's Capital 24m ago" [ref=e351] [cursor=pointer]:
              - generic [ref=e355]:
                - paragraph [ref=e357]: Identify France's Capital
                - generic [ref=e359]: 24m ago
            - button "Delete task" [ref=e361] [cursor=pointer]:
              - img [ref=e362]
          - generic [ref=e365]:
            - 'button "E2E: What is 2+2? 25m ago In progress" [ref=e366] [cursor=pointer]':
              - generic [ref=e370]:
                - paragraph [ref=e372]: "E2E: What is 2+2?"
                - generic [ref=e373]:
                  - generic [ref=e374]: 25m ago
                  - generic [ref=e375]: In progress
            - button "Delete task" [ref=e377] [cursor=pointer]:
              - img [ref=e378]
          - generic [ref=e381]:
            - 'button "E2E: Model selector test 33m ago In progress" [ref=e382] [cursor=pointer]':
              - generic [ref=e386]:
                - paragraph [ref=e388]: "E2E: Model selector test"
                - generic [ref=e389]:
                  - generic [ref=e390]: 33m ago
                  - generic [ref=e391]: In progress
            - button "Delete task" [ref=e393] [cursor=pointer]:
              - img [ref=e394]
          - generic [ref=e397]:
            - 'button "E2E: Disclaimer test 33m ago In progress" [ref=e398] [cursor=pointer]':
              - generic [ref=e402]:
                - paragraph [ref=e404]: "E2E: Disclaimer test"
                - generic [ref=e405]:
                  - generic [ref=e406]: 33m ago
                  - generic [ref=e407]: In progress
            - button "Delete task" [ref=e409] [cursor=pointer]:
              - img [ref=e410]
          - generic [ref=e413]:
            - 'button "E2E: Branch test 33m ago In progress" [ref=e414] [cursor=pointer]':
              - generic [ref=e418]:
                - paragraph [ref=e420]: "E2E: Branch test"
                - generic [ref=e421]:
                  - generic [ref=e422]: 33m ago
                  - generic [ref=e423]: In progress
            - button "Delete task" [ref=e425] [cursor=pointer]:
              - img [ref=e426]
          - generic [ref=e429]:
            - 'button "E2E: Write a long essay about AI 33m ago In progress" [ref=e430] [cursor=pointer]':
              - generic [ref=e434]:
                - paragraph [ref=e436]: "E2E: Write a long essay about AI"
                - generic [ref=e437]:
                  - generic [ref=e438]: 33m ago
                  - generic [ref=e439]: In progress
            - button "Delete task" [ref=e441] [cursor=pointer]:
              - img [ref=e442]
          - generic [ref=e445]:
            - 'button "E2E: Voice test 33m ago In progress" [ref=e446] [cursor=pointer]':
              - generic [ref=e450]:
                - paragraph [ref=e452]: "E2E: Voice test"
                - generic [ref=e453]:
                  - generic [ref=e454]: 33m ago
                  - generic [ref=e455]: In progress
            - button "Delete task" [ref=e457] [cursor=pointer]:
              - img [ref=e458]
          - generic [ref=e461]:
            - 'button "E2E: Mode test 34m ago In progress" [ref=e462] [cursor=pointer]':
              - generic [ref=e466]:
                - paragraph [ref=e468]: "E2E: Mode test"
                - generic [ref=e469]:
                  - generic [ref=e470]: 34m ago
                  - generic [ref=e471]: In progress
            - button "Delete task" [ref=e473] [cursor=pointer]:
              - img [ref=e474]
          - generic [ref=e477]:
            - 'button "E2E: Share test 34m ago" [ref=e478] [cursor=pointer]':
              - generic [ref=e482]:
                - paragraph [ref=e484]: "E2E: Share test"
                - generic [ref=e486]: 34m ago
            - button "Delete task" [ref=e488] [cursor=pointer]:
              - img [ref=e489]
          - generic [ref=e492]:
            - 'button "E2E: Workspace test 34m ago In progress" [ref=e493] [cursor=pointer]':
              - generic [ref=e497]:
                - paragraph [ref=e499]: "E2E: Workspace test"
                - generic [ref=e500]:
                  - generic [ref=e501]: 34m ago
                  - generic [ref=e502]: In progress
            - button "Delete task" [ref=e504] [cursor=pointer]:
              - img [ref=e505]
          - generic [ref=e508]:
            - button "Initial Greeting and Assistance Offer 34m ago" [ref=e509] [cursor=pointer]:
              - generic [ref=e513]:
                - paragraph [ref=e515]: Initial Greeting and Assistance Offer
                - generic [ref=e517]: 34m ago
            - button "Delete task" [ref=e519] [cursor=pointer]:
              - img [ref=e520]
          - generic [ref=e523]:
            - button "E2E Capital of France Query 34m ago" [ref=e524] [cursor=pointer]:
              - generic [ref=e528]:
                - paragraph [ref=e530]: E2E Capital of France Query
                - generic [ref=e532]: 34m ago
            - button "Delete task" [ref=e534] [cursor=pointer]:
              - img [ref=e535]
          - generic [ref=e538]:
            - 'button "E2E: Simple math 3+3 34m ago In progress" [ref=e539] [cursor=pointer]':
              - generic [ref=e543]:
                - paragraph [ref=e545]: "E2E: Simple math 3+3"
                - generic [ref=e546]:
                  - generic [ref=e547]: 34m ago
                  - generic [ref=e548]: In progress
            - button "Delete task" [ref=e550] [cursor=pointer]:
              - img [ref=e551]
          - generic [ref=e554]:
            - 'button "E2E: What is 2+2? 34m ago In progress" [ref=e555] [cursor=pointer]':
              - generic [ref=e559]:
                - paragraph [ref=e561]: "E2E: What is 2+2?"
                - generic [ref=e562]:
                  - generic [ref=e563]: 34m ago
                  - generic [ref=e564]: In progress
            - button "Delete task" [ref=e566] [cursor=pointer]:
              - img [ref=e567]
          - generic [ref=e570]:
            - 'button "E2E: Model selector test 38m ago In progress" [ref=e571] [cursor=pointer]':
              - generic [ref=e575]:
                - paragraph [ref=e577]: "E2E: Model selector test"
                - generic [ref=e578]:
                  - generic [ref=e579]: 38m ago
                  - generic [ref=e580]: In progress
            - button "Delete task" [ref=e582] [cursor=pointer]:
              - img [ref=e583]
          - generic [ref=e586]:
            - 'button "E2E: Model selector test 39m ago In progress" [ref=e587] [cursor=pointer]':
              - generic [ref=e591]:
                - paragraph [ref=e593]: "E2E: Model selector test"
                - generic [ref=e594]:
                  - generic [ref=e595]: 39m ago
                  - generic [ref=e596]: In progress
            - button "Delete task" [ref=e598] [cursor=pointer]:
              - img [ref=e599]
          - generic [ref=e602]:
            - 'button "E2E: Disclaimer test 39m ago In progress" [ref=e603] [cursor=pointer]':
              - generic [ref=e607]:
                - paragraph [ref=e609]: "E2E: Disclaimer test"
                - generic [ref=e610]:
                  - generic [ref=e611]: 39m ago
                  - generic [ref=e612]: In progress
            - button "Delete task" [ref=e614] [cursor=pointer]:
              - img [ref=e615]
          - generic [ref=e618]:
            - button "E2E Branch Test Clarification 39m ago" [ref=e619] [cursor=pointer]:
              - generic [ref=e623]:
                - paragraph [ref=e625]: E2E Branch Test Clarification
                - generic [ref=e627]: 39m ago
            - button "Delete task" [ref=e629] [cursor=pointer]:
              - img [ref=e630]
          - generic [ref=e633]:
            - button "Demo App Created, Awaiting Content 39m ago" [ref=e634] [cursor=pointer]:
              - generic [ref=e638]:
                - paragraph [ref=e640]: Demo App Created, Awaiting Content
                - generic [ref=e642]: 39m ago
            - button "Delete task" [ref=e644] [cursor=pointer]:
              - img [ref=e645]
          - generic [ref=e648]:
            - 'button "E2E: Write a long essay about AI 39m ago In progress" [ref=e649] [cursor=pointer]':
              - generic [ref=e653]:
                - paragraph [ref=e655]: "E2E: Write a long essay about AI"
                - generic [ref=e656]:
                  - generic [ref=e657]: 39m ago
                  - generic [ref=e658]: In progress
            - button "Delete task" [ref=e660] [cursor=pointer]:
              - img [ref=e661]
          - generic [ref=e664]:
            - 'button "E2E: Voice test 39m ago In progress" [ref=e665] [cursor=pointer]':
              - generic [ref=e669]:
                - paragraph [ref=e671]: "E2E: Voice test"
                - generic [ref=e672]:
                  - generic [ref=e673]: 39m ago
                  - generic [ref=e674]: In progress
            - button "Delete task" [ref=e676] [cursor=pointer]:
              - img [ref=e677]
          - generic [ref=e680]:
            - 'button "E2E: Mode test 39m ago In progress" [ref=e681] [cursor=pointer]':
              - generic [ref=e685]:
                - paragraph [ref=e687]: "E2E: Mode test"
                - generic [ref=e688]:
                  - generic [ref=e689]: 39m ago
                  - generic [ref=e690]: In progress
            - button "Delete task" [ref=e692] [cursor=pointer]:
              - img [ref=e693]
          - generic [ref=e696]:
            - button "E2E Mode Test 40m ago" [ref=e697] [cursor=pointer]:
              - generic [ref=e701]:
                - paragraph [ref=e703]: E2E Mode Test
                - generic [ref=e705]: 40m ago
            - button "Delete task" [ref=e707] [cursor=pointer]:
              - img [ref=e708]
          - generic [ref=e711]:
            - 'button "E2E: Share test 40m ago In progress" [ref=e712] [cursor=pointer]':
              - generic [ref=e716]:
                - paragraph [ref=e718]: "E2E: Share test"
                - generic [ref=e719]:
                  - generic [ref=e720]: 40m ago
                  - generic [ref=e721]: In progress
            - button "Delete task" [ref=e723] [cursor=pointer]:
              - img [ref=e724]
          - generic [ref=e727]:
            - 'button "E2E: Workspace test 40m ago In progress" [ref=e728] [cursor=pointer]':
              - generic [ref=e732]:
                - paragraph [ref=e734]: "E2E: Workspace test"
                - generic [ref=e735]:
                  - generic [ref=e736]: 40m ago
                  - generic [ref=e737]: In progress
            - button "Delete task" [ref=e739] [cursor=pointer]:
              - img [ref=e740]
          - generic [ref=e743]:
            - button "Greeting and Offer of Assistance 40m ago" [ref=e744] [cursor=pointer]:
              - generic [ref=e748]:
                - paragraph [ref=e750]: Greeting and Offer of Assistance
                - generic [ref=e752]: 40m ago
            - button "Delete task" [ref=e754] [cursor=pointer]:
              - img [ref=e755]
          - generic [ref=e758]:
            - button "E2E Hello Test 41m ago" [ref=e759] [cursor=pointer]:
              - generic [ref=e763]:
                - paragraph [ref=e765]: E2E Hello Test
                - generic [ref=e767]: 41m ago
            - button "Delete task" [ref=e769] [cursor=pointer]:
              - img [ref=e770]
          - generic [ref=e773]:
            - 'button "E2E: Simple math 3+3 41m ago In progress" [ref=e774] [cursor=pointer]':
              - generic [ref=e778]:
                - paragraph [ref=e780]: "E2E: Simple math 3+3"
                - generic [ref=e781]:
                  - generic [ref=e782]: 41m ago
                  - generic [ref=e783]: In progress
            - button "Delete task" [ref=e785] [cursor=pointer]:
              - img [ref=e786]
          - generic [ref=e789]:
            - 'button "E2E: Capital of France? 41m ago In progress" [ref=e790] [cursor=pointer]':
              - generic [ref=e794]:
                - paragraph [ref=e796]: "E2E: Capital of France?"
                - generic [ref=e797]:
                  - generic [ref=e798]: 41m ago
                  - generic [ref=e799]: In progress
            - button "Delete task" [ref=e801] [cursor=pointer]:
              - img [ref=e802]
          - generic [ref=e805]:
            - 'button "E2E: What is 2+2? 41m ago In progress" [ref=e806] [cursor=pointer]':
              - generic [ref=e810]:
                - paragraph [ref=e812]: "E2E: What is 2+2?"
                - generic [ref=e813]:
                  - generic [ref=e814]: 41m ago
                  - generic [ref=e815]: In progress
            - button "Delete task" [ref=e817] [cursor=pointer]:
              - img [ref=e818]
          - generic [ref=e821]:
            - 'button "E2E: Model selector test 49m ago In progress" [ref=e822] [cursor=pointer]':
              - generic [ref=e826]:
                - paragraph [ref=e828]: "E2E: Model selector test"
                - generic [ref=e829]:
                  - generic [ref=e830]: 49m ago
                  - generic [ref=e831]: In progress
            - button "Delete task" [ref=e833] [cursor=pointer]:
              - img [ref=e834]
          - generic [ref=e837]:
            - 'button "E2E: Model selector test 50m ago In progress" [ref=e838] [cursor=pointer]':
              - generic [ref=e842]:
                - paragraph [ref=e844]: "E2E: Model selector test"
                - generic [ref=e845]:
                  - generic [ref=e846]: 50m ago
                  - generic [ref=e847]: In progress
            - button "Delete task" [ref=e849] [cursor=pointer]:
              - img [ref=e850]
      - navigation "Sidebar navigation" [ref=e853]:
        - generic [ref=e854]: Manus
        - link "Analytics" [ref=e855] [cursor=pointer]:
          - /url: /analytics
          - img [ref=e856]
          - text: Analytics
        - link "Memory" [ref=e858] [cursor=pointer]:
          - /url: /memory
          - img [ref=e859]
          - text: Memory
        - link "Projects" [ref=e869] [cursor=pointer]:
          - /url: /projects
          - img [ref=e870]
          - text: Projects
        - link "Library" [ref=e872] [cursor=pointer]:
          - /url: /library
          - img [ref=e873]
          - text: Library
        - link "Schedules" [ref=e875] [cursor=pointer]:
          - /url: /schedule
          - img [ref=e876]
          - text: Schedules
        - link "Browser" [ref=e879] [cursor=pointer]:
          - /url: /browser
          - img [ref=e880]
          - text: Browser
      - generic [ref=e883] [cursor=pointer]:
        - generic [ref=e884]:
          - img [ref=e885]
          - generic [ref=e890]: Share with a friend
        - paragraph [ref=e891]: Get 500 credits each
      - generic [ref=e892]:
        - button "MP Michael" [ref=e893] [cursor=pointer]:
          - generic [ref=e894]: MP
          - generic [ref=e895]: Michael
        - generic [ref=e896]:
          - 'button "Theme: Light" [ref=e897] [cursor=pointer]':
            - img [ref=e898]
          - button "Settings" [ref=e904] [cursor=pointer]:
            - img [ref=e905]
          - button "Keyboard shortcuts (?)" [ref=e908] [cursor=pointer]:
            - img [ref=e909]
          - button "Collapse sidebar" [ref=e911] [cursor=pointer]:
            - img [ref=e912]
    - generic [ref=e915]:
      - status "System notifications"
      - main [ref=e916]
  - dialog "Welcome to Manus" [ref=e920]:
    - button "Close" [ref=e921] [cursor=pointer]:
      - img [ref=e922]
    - img [ref=e926]
    - heading "Welcome to Manus" [level=2] [ref=e928]
    - paragraph [ref=e929]: Your autonomous AI agent that can research, build, design, and automate — all from a single prompt.
    - generic [ref=e930]:
      - generic [ref=e931]:
        - button "Go to step 1" [ref=e932] [cursor=pointer]
        - button "Go to step 2" [ref=e933] [cursor=pointer]
        - button "Go to step 3" [ref=e934] [cursor=pointer]
        - button "Go to step 4" [ref=e935] [cursor=pointer]
        - button "Go to step 5" [ref=e936] [cursor=pointer]
        - button "Go to step 6" [ref=e937] [cursor=pointer]
      - generic [ref=e938]:
        - button "Skip" [ref=e939] [cursor=pointer]
        - button "Next" [ref=e940] [cursor=pointer]:
          - text: Next
          - img [ref=e941]
```

# Test source

```ts
  106 |   });
  107 | 
  108 |   test("sidebar has New task button with keyboard shortcut", async ({ page }) => {
  109 |     await goHome(page);
  110 |     const newTaskBtn = page.getByText("New task");
  111 |     await expect(newTaskBtn.first()).toBeVisible({ timeout: 10000 });
  112 |   });
  113 | 
  114 |   test("sidebar has navigation links to all major pages", async ({ page }) => {
  115 |     await goHome(page);
  116 |     const navLinks = ["Analytics", "Memory", "Projects", "Library", "Schedules"];
  117 |     for (const link of navLinks) {
  118 |       const el = page.locator(`nav[aria-label="Sidebar navigation"] >> text=${link}`);
  119 |       const isVisible = await el.first().isVisible({ timeout: 3000 }).catch(() => false);
  120 |       expect(isVisible).toBe(true);
  121 |     }
  122 |   });
  123 | 
  124 |   test("task list shows existing tasks in sidebar", async ({ page }) => {
  125 |     await goHome(page);
  126 |     // Task items have the specific class pattern
  127 |     const taskItems = page.locator('button.w-full.text-left');
  128 |     const count = await taskItems.count();
  129 |     expect(count).toBeGreaterThanOrEqual(1);
  130 |   });
  131 | });
  132 | 
  133 | // ═══════════════════════════════════════════════════════════════
  134 | // VU-2: Power User — Chat Lifecycle & Streaming
  135 | // ═══════════════════════════════════════════════════════════════
  136 | 
  137 | test.describe("VU-2: Task Creation & Chat", () => {
  138 |   test("creating a task navigates to /task/:id", async ({ page }) => {
  139 |     await createTaskAndNavigate(page, "E2E: What is 2+2?");
  140 |     expect(page.url()).toMatch(/\/task\/[a-zA-Z0-9_-]+/);
  141 |   });
  142 | 
  143 |   test("task page shows user message in chat", async ({ page }) => {
  144 |     const prompt = "E2E: Capital of France?";
  145 |     await createTaskAndNavigate(page, prompt);
  146 |     await expect(page.getByText(prompt).first()).toBeVisible({ timeout: 10000 });
  147 |   });
  148 | 
  149 |   test("task page shows agent thinking indicator", async ({ page }) => {
  150 |     await createTaskAndNavigate(page, "E2E: Simple math 3+3");
  151 |     // Agent starts with "Manus is thinking" or shows streaming content
  152 |     const thinking = page.getByText("thinking").first();
  153 |     const streaming = page.locator('[class*="streaming"], [class*="message"]').first();
  154 |     const hasActivity = await thinking.isVisible({ timeout: 15000 }).catch(() => false) ||
  155 |                         await streaming.isVisible({ timeout: 5000 }).catch(() => false);
  156 |     expect(hasActivity).toBe(true);
  157 |   });
  158 | 
  159 |   test("task page has follow-up chat input", async ({ page }) => {
  160 |     await createTaskAndNavigate(page, "E2E: Hello test");
  161 |     // Chat input may be input or textarea
  162 |     const chatInput = page.locator('[aria-label="Chat message input"], input[placeholder="Type a follow-up message..."], textarea[placeholder="Type a follow-up message..."]').first();
  163 |     await expect(chatInput).toBeVisible({ timeout: 15000 });
  164 |   });
  165 | 
  166 |   test("task page has workspace toggle buttons", async ({ page }) => {
  167 |     await createTaskAndNavigate(page, "E2E: Workspace test");
  168 |     const showWs = page.locator('button[aria-label="Show workspace"]');
  169 |     const hideWs = page.locator('button[aria-label="Hide workspace"]');
  170 |     const hasWorkspace = await showWs.isVisible({ timeout: 10000 }).catch(() => false) ||
  171 |                          await hideWs.isVisible({ timeout: 10000 }).catch(() => false);
  172 |     expect(hasWorkspace).toBe(true);
  173 |   });
  174 | 
  175 |   test("task page has share and bookmark buttons", async ({ page }) => {
  176 |     await createTaskAndNavigate(page, "E2E: Share test");
  177 |     const shareBtn = page.locator('button[aria-label="Share task"]');
  178 |     const bookmarkBtn = page.locator('button[aria-label="Bookmark"]');
  179 |     await expect(shareBtn).toBeVisible({ timeout: 10000 });
  180 |     await expect(bookmarkBtn).toBeVisible({ timeout: 10000 });
  181 |   });
  182 | 
  183 |   test("task page has mode toggle (quality/speed)", async ({ page }) => {
  184 |     await createTaskAndNavigate(page, "E2E: Mode test");
  185 |     // Mode button may have varying aria-label text
  186 |     const modeBtn = page.locator('button[aria-label*="Agent mode"], button[aria-label*="mode"]').first();
  187 |     const modeText = page.getByText("quality").first();
  188 |     const hasMode = await modeBtn.isVisible({ timeout: 10000 }).catch(() => false) ||
  189 |                     await modeText.isVisible({ timeout: 5000 }).catch(() => false);
  190 |     expect(hasMode).toBe(true);
  191 |   });
  192 | 
  193 |   test("task page has voice and hands-free buttons", async ({ page }) => {
  194 |     await createTaskAndNavigate(page, "E2E: Voice test");
  195 |     const voiceBtn = page.locator('button[aria-label="Voice input"]');
  196 |     const handsFreeBtn = page.locator('button[aria-label="Hands-free voice mode"]');
  197 |     await expect(voiceBtn).toBeVisible({ timeout: 10000 });
  198 |     await expect(handsFreeBtn).toBeVisible({ timeout: 10000 });
  199 |   });
  200 | 
  201 |   test("task page has stop generation button during streaming", async ({ page }) => {
  202 |     await createTaskAndNavigate(page, "E2E: Write a long essay about AI");
  203 |     const stopBtn = page.locator('button[aria-label="Stop generation"]');
  204 |     // Stop button should appear while agent is working
  205 |     const isVisible = await stopBtn.isVisible({ timeout: 15000 }).catch(() => false);
> 206 |     expect(isVisible).toBe(true);
      |                       ^ Error: expect(received).toBe(expected) // Object.is equality
  207 |   });
  208 | 
  209 |   test("task page has branch conversation button", async ({ page }) => {
  210 |     await createTaskAndNavigate(page, "E2E: Branch test");
  211 |     await page.waitForTimeout(3000);
  212 |     const branchBtn = page.locator('button[aria-label="Branch conversation from this message"]');
  213 |     const isVisible = await branchBtn.first().isVisible({ timeout: 10000 }).catch(() => false);
  214 |     expect(isVisible).toBe(true);
  215 |   });
  216 | 
  217 |   test("task page disclaimer text is visible", async ({ page }) => {
  218 |     await createTaskAndNavigate(page, "E2E: Disclaimer test");
  219 |     await expect(page.getByText("Manus may make mistakes").first()).toBeVisible({ timeout: 10000 });
  220 |   });
  221 | });
  222 | 
  223 | test.describe("VU-2: Model Selector", () => {
  224 |   test("model selector button is visible on task page", async ({ page }) => {
  225 |     await createTaskAndNavigate(page, "E2E: Model selector test");
  226 |     // Model name appears in the header — could be "Manus 1.0", "Manus Next Max", etc.
  227 |     const modelBtn = page.getByText(/Manus/).first();
  228 |     const hasModel = await modelBtn.isVisible({ timeout: 10000 }).catch(() => false);
  229 |     // If no Manus text, check for any model-related button
  230 |     const modelAlt = page.locator('button').filter({ hasText: /model|1\.0|Max|quality/ }).first();
  231 |     const hasAlt = await modelAlt.isVisible({ timeout: 5000 }).catch(() => false);
  232 |     expect(hasModel || hasAlt).toBe(true);
  233 |   });
  234 | });
  235 | 
  236 | // ═══════════════════════════════════════════════════════════════
  237 | // VU-3: Developer — GitHub Integration
  238 | // ═══════════════════════════════════════════════════════════════
  239 | 
  240 | test.describe("VU-3: GitHub Page", () => {
  241 |   test("GitHub page title and subtitle are visible", async ({ page }) => {
  242 |     await page.goto("/github", { waitUntil: "networkidle", timeout: 15000 });
  243 |     await page.waitForTimeout(2000);
  244 |     await expect(page.getByText("GitHub").first()).toBeVisible({ timeout: 10000 });
  245 |     await expect(page.getByText("Manage repositories, code, and deployments").first()).toBeVisible({ timeout: 10000 });
  246 |   });
  247 | 
  248 |   test("GitHub page has search input", async ({ page }) => {
  249 |     await page.goto("/github", { waitUntil: "networkidle", timeout: 15000 });
  250 |     await page.waitForTimeout(2000);
  251 |     const search = page.locator('input[placeholder="Search repositories..."]');
  252 |     await expect(search).toBeVisible({ timeout: 10000 });
  253 |   });
  254 | 
  255 |   test("GitHub page has Import Repo button", async ({ page }) => {
  256 |     await page.goto("/github", { waitUntil: "networkidle", timeout: 15000 });
  257 |     await page.waitForTimeout(2000);
  258 |     await expect(page.getByText("Import Repo").first()).toBeVisible({ timeout: 10000 });
  259 |   });
  260 | 
  261 |   test("GitHub page has New Repo button", async ({ page }) => {
  262 |     await page.goto("/github", { waitUntil: "networkidle", timeout: 15000 });
  263 |     await page.waitForTimeout(2000);
  264 |     await expect(page.getByText("New Repo").first()).toBeVisible({ timeout: 10000 });
  265 |   });
  266 | 
  267 |   test("GitHub page shows empty state when no repos connected", async ({ page }) => {
  268 |     await page.goto("/github", { waitUntil: "networkidle", timeout: 15000 });
  269 |     await page.waitForTimeout(2000);
  270 |     const emptyState = page.getByText("No repositories connected");
  271 |     const hasRepos = await page.locator('[class*="repo"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  272 |     // Either shows empty state or has repos
  273 |     const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
  274 |     expect(isEmpty || hasRepos).toBe(true);
  275 |   });
  276 | 
  277 |   test("GitHub API endpoint responds", async ({ request }) => {
  278 |     const response = await request.get("/api/trpc/github.listConnected");
  279 |     // Accept any non-500 status — 401 means auth required, 200 means success
  280 |     expect(response.status()).not.toBe(500);
  281 |   });
  282 | });
  283 | 
  284 | // ═══════════════════════════════════════════════════════════════
  285 | // VU-4: QA Engineer — Browser Automation
  286 | // ═══════════════════════════════════════════════════════════════
  287 | 
  288 | test.describe("VU-4: Browser Page", () => {
  289 |   test("browser page has URL input", async ({ page }) => {
  290 |     await page.goto("/browser", { waitUntil: "networkidle", timeout: 15000 });
  291 |     await page.waitForTimeout(2000);
  292 |     const urlInput = page.locator('input[placeholder="Enter URL or search..."]');
  293 |     await expect(urlInput).toBeVisible({ timeout: 10000 });
  294 |   });
  295 | 
  296 |   test("browser page has mode buttons (Navigate, Click, Type, Scroll, Evaluate)", async ({ page }) => {
  297 |     await page.goto("/browser", { waitUntil: "networkidle", timeout: 15000 });
  298 |     await page.waitForTimeout(2000);
  299 |     const modes = ["Navigate", "Click", "Type", "Scroll", "Evaluate"];
  300 |     for (const mode of modes) {
  301 |       await expect(page.getByText(mode, { exact: true }).first()).toBeVisible({ timeout: 5000 });
  302 |     }
  303 |   });
  304 | 
  305 |   test("browser page has example button", async ({ page }) => {
  306 |     await page.goto("/browser", { waitUntil: "networkidle", timeout: 15000 });
```