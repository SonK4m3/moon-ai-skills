---
name: notex-fe-gitflow
description: Git flow bốn môi trường của NoteX Interface — main/develop/staging/prod, cherry-pick để test trước khi merge, và cách resolve conflict. Dùng khi làm việc với nhánh môi trường, khi cherry-pick, khi tạo PR, khi xử lý conflict giữa develop/staging và main, hoặc khi cần biết code đã lên môi trường nào.
---

# Git Flow — NoteX Interface

> Bản đầy đủ: `docs/agents/git-flow.md` trong repo `notex-interface`. Bản máy-đọc-được: `.ledger/flow.yml`.
> Skill này là bản mang theo, để agent ngoài repo đó vẫn biết flow mà không cần mở repo.

## Nguyên tắc gốc

**PR luôn target `main`. Không PR trực tiếp vào `develop`/`staging`/`prod`.**

Cherry-pick để **test trước**, merge PR **sau khi verify**. `prod` chỉ nhận merge từ `main`, không bao giờ nhận cherry-pick.

| Branch | Environment | Vai trò |
|---|---|---|
| `main` | — | Nguồn sự thật, đích của mọi PR |
| `develop` | develop | Phát triển, tính năng mới |
| `staging` | staging | Test trước production |
| `prod` | production | Đang chạy thật |

## Feature / Migration Flow

```
1. Nhánh từ main
   git checkout main && git pull origin main
   git checkout -b feat/<name>

2. Code, commit theo conventional commits
   git commit -m "feat(scope): description"

3. Push
   git push origin feat/<name> --no-verify

4. Mở PR → main

5. Cherry-pick sang develop & staging để test TRƯỚC merge
   git checkout develop && git pull origin develop
   git cherry-pick <hash1> <hash2> ...
   npm run typecheck && npm run build      # CỔNG BẮT BUỘC
   git push origin develop --no-verify

   git checkout staging && git pull origin staging
   git cherry-pick <hash1> <hash2> ...
   npm run typecheck && npm run build
   git push origin staging --no-verify

6. Verify cả hai môi trường OK → merge PR vào main

7. Sync main → prod
   git checkout main && git pull origin main
   git checkout prod && git merge main --no-edit
   git push origin prod --no-verify
```

## Hotfix Flow

Giống feature, chỉ đổi tên nhánh thành `hotfix/<name>` và commit `fix(scope): …`.

## Reviewer cherry-pick một PR của người khác

```
1. Review PR — đọc description để hiểu scope, file nào là core, logic mới là gì
   (nếu để AI agent làm bước này: cần `gh auth` hoặc dán PR description vào,
    không thì agent resolve conflict mà không hiểu context)

2. Lấy danh sách commit
   git fetch origin pull/<number>/head:pr-<number>
   git log --oneline pr-<number> --not origin/main

3. Cherry-pick sang develop → typecheck + build → push
4. Cherry-pick sang staging → typecheck + build → push
5. Nếu conflict: theo mục dưới
6. Ghi nhật ký vào docs/cherry-pick-tracking.md, commit riêng, prefix `docs:`
7. Verify cả hai env OK → approve & merge PR vào main
```

## Conflict — cách resolve

| Loại conflict | Cách xử |
|---|---|
| Import đổi do migration | Lấy bản mới (incoming) |
| Logic do develop/staging thêm | **Giữ cả hai** — logic env + apply thay đổi mới |
| JSON keys (locales) | **Giữ cả hai** — keys của env + keys của feature |
| Khác hoàn toàn | `git checkout --ours <file>` rồi apply thủ công |

Ba quy tắc không được vi phạm:
1. **Giữ logic đang chạy của env** — không xoá code đang hoạt động trên `develop`/`staging`.
2. **Ghi chú conflict vào commit message** — giữ message gốc, thêm khối `Conflict resolved:` nêu rõ file nào giữ gì của ai và **vì sao**.
3. **Conflict quá nhiều thì dừng** — đề xuất merge `main` vào `develop`/`staging` thay vì cherry-pick, đừng cố resolve cho xong.

## Nhật ký cherry-pick

File `docs/cherry-pick-tracking.md`, sống trên **từng nhánh env**.

- Ghi **sau khi** tất cả commit đã cherry-pick thành công lên env đó
- Ghi: ngày giờ · env · nhánh nguồn · số PR · danh sách commit · ghi chú conflict
- Commit **riêng**, message dùng prefix `docs:` — **không** dùng `feat:`/`fix:`, để không lẫn với commit code trong git log
- **Không bao giờ cherry-pick chính file này** sang nhánh khác — nó là nhật ký của riêng nhánh đó

```
docs: track cherry-pick PR #475 to develop
docs: track cherry-pick PR #475 to staging
```

## Lệnh hay dùng

```bash
# Fetch PR ref khi không biết tên nhánh
git fetch origin pull/<number>/head:pr-<number>
git log --oneline pr-<number> --not origin/main

# Kiểm file có rủi ro conflict TRƯỚC khi cherry-pick
git diff --name-only origin/main..pr-<number> | while read f; do
  git diff --quiet origin/main origin/develop -- "$f" 2>/dev/null || echo "CONFLICT RISK: $f"
done

# Resolve: giữ bản env rồi apply thủ công
git checkout --ours <file>
git add <file> && git cherry-pick --continue --no-edit

# Cổng trước khi push
npm run typecheck && npm run build
```

## Nối với `ledger`

Nếu repo dùng `ledger`, các trạng thái môi trường ánh xạ thẳng:

| trạng thái | nghĩa |
|---|---|
| `cherry-picked` | đã cherry-pick sang nhánh env, **chưa** chạy cổng |
| `verified` | cổng xanh **và** đã test trên môi trường đó |
| `merged` | PR đã merge vào `main`, hoặc `prod` đã merge từ `main` |
| `failed` | cổng đỏ, hoặc conflict không giải được → **dừng, hỏi người** |

`develop`/`staging` đi `cherry-picked` → `verified`. `main`/`prod` dùng `merged`. **Đánh dấu `merged` cho `develop`/`staging` là sai** — chúng nhận cherry-pick, không nhận merge.

## Rules

- PR luôn target `main`
- Cherry-pick để test trước, merge PR sau khi verify
- `prod` chỉ nhận merge từ `main`
- Conflict quá nhiều → merge `main` vào env thay vì cherry-pick
- Sau mỗi batch cherry-pick: **luôn** chạy `typecheck` + `build` trước khi push
- Sau cherry-pick thành công: ghi nhật ký và commit riêng
- Commit nhật ký dùng prefix `docs:`
- AI agent hỗ trợ cherry-pick cần `gh auth` hoặc PR description để resolve đúng context
