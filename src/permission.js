import router from './router'
// import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isHttp } from '@/utils/validate'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login']

router.beforeEach((to, from, next) => {
  NProgress.start()
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title)
    /* has token*/
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasRoles =
        (useUserStore().menuList && useUserStore().menuList.length > 0) ||
        useUserStore().permissionFlag
      if (hasRoles) {
        next()
      } else {
        try {
          useUserStore()
            .getPermission()
            .then((res) => {
              const data = res.data
              usePermissionStore()
                .generateRoutes(data)
                .then((accessRoutes) => {
                  // 根据roles权限生成可访问的路由表
                  accessRoutes.forEach((route) => {
                    if (!isHttp(route.path)) {
                      router.addRoute(route) // 动态添加可访问路由表
                    }
                  })
                  next({ ...to, replace: true }) // hack方法 确保addRoutes已完成
                })
            })
        } catch (e) {
          useUserStore()
            .resetToken()
            .then(() => {
              ElMessage.error(e || 'Has Error')
              next({ path: '/' })
            })
        }
      }
    }
  } else {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})
